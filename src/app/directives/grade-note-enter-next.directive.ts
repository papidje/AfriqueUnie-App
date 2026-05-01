import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

const NOTE_INPUT_SELECTOR = 'input.grade-note-input:not([disabled])';

/**
 * Sur Entrée, déplace le focus vers l’input note de la ligne suivante (saisie rapide).
 * {@link appGradeNoteEnterNextGroup} est optionnel (réserve pour extension).
 */
@Directive({
  selector: 'input.grade-note-input[appGradeNoteEnterNext]',
  exportAs: 'gradeNoteEnter'
})
export class GradeNoteEnterNextDirective {
  @Input() appGradeNoteEnterNextGroup: FormGroup | null = null;

  constructor(private readonly host: ElementRef<HTMLInputElement>) {}

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== 'NumpadEnter') {
      return;
    }
    e.preventDefault();
    const el = this.host.nativeElement;
    const list = Array.from(
      document.querySelectorAll<HTMLInputElement>(NOTE_INPUT_SELECTOR)
    );
    const i = list.indexOf(el);
    if (i >= 0 && i < list.length - 1) {
      list[i + 1].focus();
      list[i + 1].select?.();
    }
  }
}
