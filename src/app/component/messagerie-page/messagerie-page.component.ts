import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../service/auth.service';
import {
  MessagingApiService,
  MessagingConversation,
  MessagingMessage
} from '../../service/messaging-api.service';
import { formatDisplayDateTime } from '../../shared/util/display-date.util';
import { NewMessageDialogComponent } from './new-message-dialog.component';

@Component({
  selector: 'app-messagerie-page',
  templateUrl: './messagerie-page.component.html',
  styleUrls: ['./messagerie-page.component.scss']
})
export class MessageriePageComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('threadScroll') threadScroll?: ElementRef<HTMLElement>;

  private readonly destroy$ = new Subject<void>();
  private stickToBottom = true;
  private pendingScrollBottom = false;
  private pendingPreserveScroll: { height: number; top: number } | null = null;
  private lastMessageId: number | null = null;
  private loadingOlder = false;

  search = '';
  conversations: MessagingConversation[] = [];
  filteredConversations: MessagingConversation[] = [];
  listLoading = true;
  listError = false;

  active: MessagingConversation | null = null;
  messages: MessagingMessage[] = [];
  threadLoading = false;
  draft = '';
  sending = false;
  pendingNewCount = 0;
  mobileShowThread = false;

  constructor(
    private readonly messagingApi: MessagingApiService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly authService: AuthService
  ) {}

  get tenantDesactive(): boolean {
    return this.authService.isTenantDisabledSession();
  }

  ngOnInit(): void {
    this.reloadConversations();
    timer(8000, 8000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (typeof document !== 'undefined' && document.hidden) {
            return of(null);
          }
          return this.messagingApi.listConversations().pipe(catchError(() => of(null)));
        })
      )
      .subscribe((rows) => {
        if (!rows) {
          return;
        }
        this.conversations = rows;
        this.applyLocalFilter();
        this.syncActiveFromList();
      });

    timer(5000, 5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (!this.active || (typeof document !== 'undefined' && document.hidden)) {
            return of(null);
          }
          const afterId = this.lastMessageId ?? undefined;
          return this.messagingApi
            .listMessages(this.active.id, { afterId, limit: 50 })
            .pipe(catchError(() => of(null)));
        })
      )
      .subscribe((rows) => {
        if (!rows?.length || !this.active) {
          return;
        }
        const existing = new Set(this.messages.map((m) => m.id));
        const fresh = rows.filter((m) => !existing.has(m.id));
        if (!fresh.length) {
          return;
        }
        this.messages = [...this.messages, ...fresh];
        this.lastMessageId = this.messages[this.messages.length - 1]?.id ?? this.lastMessageId;
        if (this.stickToBottom) {
          this.pendingScrollBottom = true;
          this.pendingNewCount = 0;
          this.markActiveRead();
        } else {
          this.pendingNewCount += fresh.filter((m) => !m.mine).length;
        }
        this.reloadConversationsQuiet();
      });
  }

  ngAfterViewChecked(): void {
    const el = this.threadScroll?.nativeElement;
    if (!el) {
      return;
    }
    if (this.pendingPreserveScroll) {
      const delta = el.scrollHeight - this.pendingPreserveScroll.height;
      el.scrollTop = this.pendingPreserveScroll.top + delta;
      this.pendingPreserveScroll = null;
    }
    if (this.pendingScrollBottom) {
      el.scrollTop = el.scrollHeight;
      this.pendingScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (!document.hidden) {
      this.reloadConversationsQuiet();
      if (this.active) {
        this.pollActiveOnce();
      }
    }
  }

  reloadConversations(): void {
    this.listLoading = true;
    this.listError = false;
    this.messagingApi.listConversations(this.search).subscribe({
      next: (rows) => {
        this.conversations = rows || [];
        this.applyLocalFilter();
        this.listLoading = false;
        this.messagingApi.bumpUnreadListeners();
      },
      error: () => {
        this.conversations = [];
        this.filteredConversations = [];
        this.listLoading = false;
        this.listError = true;
      }
    });
  }

  private reloadConversationsQuiet(): void {
    this.messagingApi.listConversations(this.search).subscribe({
      next: (rows) => {
        this.conversations = rows || [];
        this.applyLocalFilter();
        this.syncActiveFromList();
        this.messagingApi.bumpUnreadListeners();
      },
      error: () => undefined
    });
  }

  onSearchChange(): void {
    this.applyLocalFilter();
  }

  private applyLocalFilter(): void {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.filteredConversations = this.conversations;
      return;
    }
    this.filteredConversations = this.conversations.filter((c) => {
      const hay = [
        c.counterpart?.fullname,
        c.counterpart?.email,
        c.lastMessagePreview
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  private syncActiveFromList(): void {
    if (!this.active) {
      return;
    }
    const updated = this.conversations.find((c) => c.id === this.active!.id);
    if (updated) {
      this.active = updated;
    }
  }

  openNewMessage(): void {
    const ref = this.dialog.open(NewMessageDialogComponent, {
      width: '440px',
      maxHeight: '80vh'
    });
    ref.afterClosed().subscribe((conv) => {
      if (conv) {
        this.reloadConversationsQuiet();
        this.selectConversation(conv);
      }
    });
  }

  selectConversation(conv: MessagingConversation): void {
    this.active = conv;
    this.mobileShowThread = true;
    this.messages = [];
    this.lastMessageId = null;
    this.pendingNewCount = 0;
    this.stickToBottom = true;
    this.threadLoading = true;
    this.messagingApi.listMessages(conv.id, { limit: 50 }).subscribe({
      next: (rows) => {
        this.messages = rows || [];
        this.lastMessageId = this.messages.length
          ? this.messages[this.messages.length - 1].id
          : null;
        this.threadLoading = false;
        this.pendingScrollBottom = true;
        this.markActiveRead();
      },
      error: () => {
        this.threadLoading = false;
        this.snackBar.open('Impossible de charger les messages.', 'Fermer', { duration: 4000 });
      }
    });
  }

  backToList(): void {
    this.mobileShowThread = false;
  }

  onThreadScroll(): void {
    const el = this.threadScroll?.nativeElement;
    if (!el) {
      return;
    }
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.stickToBottom = distance < 80;
    if (this.stickToBottom) {
      this.pendingNewCount = 0;
    }
    if (el.scrollTop < 48 && !this.loadingOlder && this.messages.length) {
      this.loadOlder();
    }
  }

  jumpToLatest(): void {
    this.stickToBottom = true;
    this.pendingNewCount = 0;
    this.pendingScrollBottom = true;
    this.markActiveRead();
  }

  private loadOlder(): void {
    if (!this.active || !this.messages.length) {
      return;
    }
    const beforeId = this.messages[0].id;
    const el = this.threadScroll?.nativeElement;
    if (el) {
      this.pendingPreserveScroll = { height: el.scrollHeight, top: el.scrollTop };
    }
    this.loadingOlder = true;
    this.messagingApi.listMessages(this.active.id, { beforeId, limit: 40 }).subscribe({
      next: (rows) => {
        const older = (rows || []).filter((m) => m.id < beforeId);
        if (older.length) {
          this.messages = [...older, ...this.messages];
        } else {
          this.pendingPreserveScroll = null;
        }
        this.loadingOlder = false;
      },
      error: () => {
        this.pendingPreserveScroll = null;
        this.loadingOlder = false;
      }
    });
  }

  private pollActiveOnce(): void {
    if (!this.active) {
      return;
    }
    const afterId = this.lastMessageId ?? undefined;
    this.messagingApi.listMessages(this.active.id, { afterId, limit: 50 }).subscribe({
      next: (rows) => {
        if (!rows?.length) {
          return;
        }
        const existing = new Set(this.messages.map((m) => m.id));
        const fresh = rows.filter((m) => !existing.has(m.id));
        if (!fresh.length) {
          return;
        }
        this.messages = [...this.messages, ...fresh];
        this.lastMessageId = this.messages[this.messages.length - 1]?.id ?? this.lastMessageId;
        if (this.stickToBottom) {
          this.pendingScrollBottom = true;
          this.markActiveRead();
        } else {
          this.pendingNewCount += fresh.filter((m) => !m.mine).length;
        }
      },
      error: () => undefined
    });
  }

  private markActiveRead(): void {
    if (!this.active) {
      return;
    }
    const id = this.active.id;
    this.messagingApi.markRead(id).subscribe({
      next: () => {
        this.conversations = this.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        );
        this.applyLocalFilter();
        if (this.active?.id === id) {
          this.active = { ...this.active, unreadCount: 0 };
        }
        this.messagingApi.bumpUnreadListeners();
      },
      error: () => undefined
    });
  }

  send(): void {
    if (!this.active || this.sending) {
      return;
    }
    const body = this.draft.trim();
    if (!body) {
      return;
    }
    this.sending = true;
    this.messagingApi.sendMessage(this.active.id, body).subscribe({
      next: (msg) => {
        this.draft = '';
        this.sending = false;
        this.messages = [...this.messages, msg];
        this.lastMessageId = msg.id;
        this.stickToBottom = true;
        this.pendingScrollBottom = true;
        this.pendingNewCount = 0;
        this.reloadConversationsQuiet();
      },
      error: (err) => {
        this.sending = false;
        const m = err?.error?.message || err?.error?.detail || 'Envoi impossible.';
        this.snackBar.open(m, 'Fermer', { duration: 4500 });
      }
    });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  initials(name: string | undefined): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
  }

  formatWhen(iso: string | null | undefined): string {
    return formatDisplayDateTime(iso);
  }

  formatTime(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
