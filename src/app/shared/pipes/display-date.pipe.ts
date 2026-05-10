import { Pipe, PipeTransform } from '@angular/core';
import { formatDisplayDate, formatDisplayDateTime, formatDisplayDateTimeAt } from '../util/display-date.util';

@Pipe({ name: 'displayDate' })
export class DisplayDatePipe implements PipeTransform {
  transform(value: unknown, mode: string = 'date'): string {
    if (mode === 'datetime') {
      return formatDisplayDateTime(value);
    }
    if (mode === 'at') {
      return formatDisplayDateTimeAt(value);
    }
    return formatDisplayDate(value);
  }
}
