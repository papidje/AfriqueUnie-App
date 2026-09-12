import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MessagingApiService,
  MessagingConversation,
  MessagingUserSummary
} from '../../service/messaging-api.service';

@Component({
  selector: 'app-new-message-dialog',
  templateUrl: './new-message-dialog.component.html',
  styleUrls: ['./new-message-dialog.component.scss']
})
export class NewMessageDialogComponent implements OnInit {
  search = '';
  contacts: MessagingUserSummary[] = [];
  loading = true;
  selectingId: number | null = null;

  constructor(
    private readonly messagingApi: MessagingApiService,
    private readonly dialogRef: MatDialogRef<NewMessageDialogComponent, MessagingConversation | undefined>,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.messagingApi.listContacts(this.search).subscribe({
      next: (rows) => {
        this.contacts = rows || [];
        this.loading = false;
      },
      error: () => {
        this.contacts = [];
        this.loading = false;
        this.snackBar.open('Impossible de charger les contacts.', 'Fermer', { duration: 4000 });
      }
    });
  }

  select(contact: MessagingUserSummary): void {
    this.selectingId = contact.id;
    this.messagingApi.getOrCreateWith(contact.id).subscribe({
      next: (conv) => {
        this.selectingId = null;
        this.dialogRef.close(conv);
      },
      error: (err) => {
        this.selectingId = null;
        const msg =
          err?.error?.message || err?.error?.detail || 'Impossible d’ouvrir la conversation.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
  }
}
