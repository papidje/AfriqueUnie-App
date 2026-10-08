import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ClassLevelAdminDto,
  ClassLevelGroupAdminDto,
  ClassLevelWritePayload,
  ClassLevelGroupWritePayload,
  SuperAdminService
} from '../../service/super-admin.service';

@Component({
  selector: 'app-super-admin-levels-page',
  templateUrl: './super-admin-levels-page.component.html',
  styleUrls: ['./super-admin-levels-page.component.scss']
})
export class SuperAdminLevelsPageComponent implements OnInit {
  groups: ClassLevelGroupAdminDto[] = [];
  levels: ClassLevelAdminDto[] = [];
  loadingGroups = true;
  loadingLevels = true;
  savingGroup = false;
  savingLevel = false;
  groupFormOpen = false;
  levelFormOpen = false;
  groupEditingId: number | null = null;
  levelEditingId: number | null = null;
  levelSearch = '';

  readonly groupForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sortOrder: [10 as number, [Validators.required]]
  });

  readonly levelForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    groupId: [null as number | null, Validators.required],
    sortOrder: [10 as number, [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly superAdminService: SuperAdminService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reloadGroups();
    this.reloadLevels();
  }

  get filteredLevels(): ClassLevelAdminDto[] {
    const q = (this.levelSearch || '').trim().toLowerCase();
    if (!q) {
      return this.levels;
    }
    return this.levels.filter((l) => {
      const name = (l.name || '').toLowerCase();
      const code = (l.code || '').toLowerCase();
      const group = (l.groupName || l.groupCode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || group.includes(q);
    });
  }

  reloadGroups(): void {
    this.loadingGroups = true;
    this.superAdminService.listClassLevelGroupsAdmin().subscribe({
      next: (list) => {
        this.groups = list || [];
        this.loadingGroups = false;
      },
      error: () => {
        this.groups = [];
        this.loadingGroups = false;
        this.snackBar.open('Impossible de charger les cycles.', 'Fermer', { duration: 4000 });
      }
    });
  }

  reloadLevels(): void {
    this.loadingLevels = true;
    this.superAdminService.listClassLevelsAdmin().subscribe({
      next: (list) => {
        this.levels = list || [];
        this.loadingLevels = false;
      },
      error: () => {
        this.levels = [];
        this.loadingLevels = false;
        this.snackBar.open('Impossible de charger les niveaux.', 'Fermer', { duration: 4000 });
      }
    });
  }

  // —— Cycles ——

  startCreateGroup(): void {
    this.groupEditingId = null;
    this.groupFormOpen = true;
    const nextOrder =
      this.groups.length > 0 ? Math.max(...this.groups.map((g) => g.sortOrder ?? 0)) + 10 : 10;
    this.groupForm.reset({ code: '', name: '', sortOrder: nextOrder });
  }

  startEditGroup(group: ClassLevelGroupAdminDto): void {
    this.groupEditingId = group.id;
    this.groupFormOpen = true;
    this.groupForm.reset({
      code: group.code,
      name: group.name,
      sortOrder: group.sortOrder ?? 10
    });
  }

  cancelGroupEdit(): void {
    this.groupFormOpen = false;
    this.groupEditingId = null;
    this.groupForm.reset({ code: '', name: '', sortOrder: 10 });
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }
    const v = this.groupForm.getRawValue();
    const body: ClassLevelGroupWritePayload = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim(),
      sortOrder: Number(v.sortOrder)
    };
    this.savingGroup = true;
    const req =
      this.groupEditingId != null
        ? this.superAdminService.updateClassLevelGroup(this.groupEditingId, body)
        : this.superAdminService.createClassLevelGroup(body);
    req.subscribe({
      next: () => {
        this.savingGroup = false;
        this.snackBar.open(
          this.groupEditingId != null ? 'Cycle mis à jour.' : 'Cycle ajouté.',
          'Fermer',
          { duration: 2500 }
        );
        this.cancelGroupEdit();
        this.reloadGroups();
        this.reloadLevels();
      },
      error: (err) => {
        this.savingGroup = false;
        const msg = err?.error?.message || err?.error?.error || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  deleteGroup(group: ClassLevelGroupAdminDto): void {
    const count = group.levelCount ?? 0;
    if (count > 0) {
      this.snackBar.open(
        `Impossible : ${count} niveau(x) rattaché(s) à ce cycle.`,
        'Fermer',
        { duration: 4500 }
      );
      return;
    }
    if (!confirm(`Supprimer le cycle « ${group.name} » ?`)) {
      return;
    }
    this.superAdminService.deleteClassLevelGroup(group.id).subscribe({
      next: () => {
        this.snackBar.open('Cycle supprimé.', 'Fermer', { duration: 2500 });
        if (this.groupEditingId === group.id) {
          this.cancelGroupEdit();
        }
        this.reloadGroups();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || 'Suppression impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  // —— Niveaux ——

  startCreateLevel(): void {
    this.levelEditingId = null;
    this.levelFormOpen = true;
    const nextOrder =
      this.levels.length > 0 ? Math.max(...this.levels.map((l) => l.sortOrder ?? 0)) + 10 : 10;
    this.levelForm.reset({
      code: '',
      name: '',
      groupId: this.groups[0]?.id ?? null,
      sortOrder: nextOrder
    });
  }

  startEditLevel(level: ClassLevelAdminDto): void {
    this.levelEditingId = level.id;
    this.levelFormOpen = true;
    this.levelForm.reset({
      code: level.code,
      name: level.name,
      groupId: level.groupId ?? null,
      sortOrder: level.sortOrder ?? 10
    });
  }

  cancelLevelEdit(): void {
    this.levelFormOpen = false;
    this.levelEditingId = null;
    this.levelForm.reset({ code: '', name: '', groupId: null, sortOrder: 10 });
  }

  saveLevel(): void {
    if (this.levelForm.invalid) {
      this.levelForm.markAllAsTouched();
      return;
    }
    const v = this.levelForm.getRawValue();
    const body: ClassLevelWritePayload = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim(),
      groupId: v.groupId as number,
      sortOrder: Number(v.sortOrder)
    };
    this.savingLevel = true;
    const req =
      this.levelEditingId != null
        ? this.superAdminService.updateClassLevel(this.levelEditingId, body)
        : this.superAdminService.createClassLevel(body);
    req.subscribe({
      next: () => {
        this.savingLevel = false;
        this.snackBar.open(
          this.levelEditingId != null ? 'Niveau mis à jour.' : 'Niveau ajouté.',
          'Fermer',
          { duration: 2500 }
        );
        this.cancelLevelEdit();
        this.reloadLevels();
        this.reloadGroups();
      },
      error: (err) => {
        this.savingLevel = false;
        const msg = err?.error?.message || err?.error?.error || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  deleteLevel(level: ClassLevelAdminDto): void {
    const usage = level.usageCount ?? 0;
    if (usage > 0) {
      this.snackBar.open(
        `Impossible : ce niveau est utilisé (${usage} référence(s)).`,
        'Fermer',
        { duration: 4500 }
      );
      return;
    }
    if (!confirm(`Supprimer le niveau « ${level.name} » ?`)) {
      return;
    }
    this.superAdminService.deleteClassLevel(level.id).subscribe({
      next: () => {
        this.snackBar.open('Niveau supprimé.', 'Fermer', { duration: 2500 });
        if (this.levelEditingId === level.id) {
          this.cancelLevelEdit();
        }
        this.reloadLevels();
        this.reloadGroups();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || 'Suppression impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
