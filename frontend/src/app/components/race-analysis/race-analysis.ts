import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { RaceService } from '../../services/race';

@Component({
  selector: 'app-race-analysis',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './race-analysis.html',
  styleUrl: './race-analysis.css',
})
export class RaceAnalysisComponent implements OnInit {
  analysis: any[] = [];
  raceId: number | null = null;
  track: string | null = null;
  date: string | null = null;
  loading = false;
  activeTooltip: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private raceService: RaceService,
    private router: Router
  ) {
    // Close tooltip when clicking anywhere on the document
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => {
        this.activeTooltip = null;
      });
    }
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.raceId = +idParam;
        this.refreshData();
      }
    });

    this.route.queryParamMap.subscribe(params => {
      this.track = params.get('track');
      this.date = params.get('date');
      this.refreshData();
    });
  }

  refreshData(): void {
    if (this.raceId && this.track && this.date) {
      this.loadAnalysis(this.track, this.date);
      this.loadSelections();
    }
  }

  loadAnalysis(track: string, date: string): void {
    this.loading = true;
    this.raceService.getRaceAnalysis(this.raceId!, track, date).subscribe({
      next: (data) => {
        this.analysis = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching analysis', err);
        this.loading = false;
      }
    });
  }

  goToPreviousRace(): void {
    if (this.raceId && this.raceId > 1) {
      this.navigateToRace(this.raceId - 1);
    }
  }

  goToNextRace(): void {
    if (this.raceId && this.raceId < 8) {
      this.navigateToRace(this.raceId + 1);
    }
  }

  toggleTooltip(event: Event, index: number): void {
    event.stopPropagation();
    this.activeTooltip = this.activeTooltip === index ? null : index;
  }

  // Selection Logic
  selectedHorses: Set<number> = new Set();
  saving = false;

  loadSelections(): void {
    if (this.track && this.date && this.raceId) {
      this.raceService.getSelections(this.track, this.date, this.raceId).subscribe({
        next: (selections) => {
          this.selectedHorses.clear();
          selections.forEach(s => this.selectedHorses.add(s.horse_number));
        },
        error: (err) => console.error('Error loading selections', err)
      });
    }
  }

  toggleSelection(horseNumber: number): void {
    const selected = !this.selectedHorses.has(horseNumber);
    if (selected) {
      this.selectedHorses.add(horseNumber);
    } else {
      this.selectedHorses.delete(horseNumber);
    }

    // Auto-save on toggle? The user requirements mentioned "add a save icon". 
    // But also "It should also be possible to deselect att horse and it will be removed from the selection".
    // I will implement explicit save for the "Save icon" requirement, but I can also save on toggle if that's better UX.
    // Given the requirement "add a save icon", I will stick to explicit save OR per-toggle save.
    // Actually, "add a save icon... that stores selected horses" implies a batch save or that the icon triggers the store.
    // However, usually checkboxes save immediately in modern apps. 
    // Let's make the checkbox save immediately for better UX, and the "Save icon" can be a visual confirmation or a bulk save if needed.
    // Re-reading: "add a save icon an en endpoint that stores selected horses". 
    // Maybe the user wants to select multiple then click save. 
    // I'll implement "Select -> Click Save".
    // So toggleSelection just updates local state.
  }

  saveSelections(): void {
    if (!this.track || !this.date || !this.raceId) return;

    this.saving = true;
    // We need to sync the current state with the backend.
    // Since our API is per-horse toggle (saveSelection expects one selection), using it for bulk save is inefficient if we iterate.
    // But I implemented "Add or remove a selection (toggle)" in backend.
    // Actually, efficient way for "Save" button is to send all current selections.
    // But my backend supports toggle. 

    // Let's just save each selected horse. And remove unselected? 
    // The backend `POST /api/selections` takes `selected: boolean`.
    // So to "Save" the current state, we effectively need to update the backend to match `selectedHorses`.
    // This is tricky with just a toggle endpoint if we don't know what changed.
    // But wait, the user asked for "Deselect all".

    // Let's improve the backend interaction.
    // I can iterate over all horses in the race and send their status? No, too many requests.
    // Maybe I should have implemented a bulk save endpoint. 
    // But for now, I will iterate over the CHANGES or just iterate over all?
    // Let's change strategy: The "Save" button will iterate over all horses in `analysis` and send their current state (selected/unselected).
    // Or better, assume "Save" means "Persist current selections".

    // Actually, maybe the "Save icon" is intended to be the mechanism to add a specific horse?
    // "select which horses I would like to bet on... add a save icon... that stores selected horses".
    // This could mean: Click checkbox -> Click Save Icon (next to it?).

    // Let's assume the standard pattern: Checkboxes update local state. A global "Save" button persists everything.
    // I will use `forkJoin` to save all.
    // Or simpler: Update `toggleSelection` to save immediately and remove the "Save" button requirement? 
    // User explicitly asked for "add a save icon". 
    // So I will implement a "Save" button that saves the *currently selected horses*.
    // But what about deselecting?
    // If I uncheck a horse and click Save, it should be removed.

    // To support this robustly with the current backend:
    // 1. Clear all selections for this race.
    // 2. Add all currently selected horses.
    // This is a transaction, but `clearSelections` + loop of `saveSelection` works.

    this.raceService.clearSelections(this.track, this.date, this.raceId).subscribe({
      next: () => {
        const observables = Array.from(this.selectedHorses).map(num =>
          this.raceService.saveSelection({
            track: this.track!,
            date: this.date!,
            race_number: this.raceId!,
            horse_number: num,
            selected: true
          })
        );

        if (observables.length > 0) {
          // forkJoin would be good here but I need to import it. 
          // Let's just promise.all equiv.
          // Since I can't easily import forkJoin without viewing imports, I'll essentially do it manually or assume standard imports.
          // `import { forkJoin } from 'rxjs';` is needed.
          // I will add the import to the top of the file in a separate edit or just chaining.

          let completed = 0;
          observables.forEach(obs => obs.subscribe({
            next: () => {
              completed++;
              if (completed === observables.length) {
                this.saving = false;
              }
            },
            error: () => this.saving = false
          }));
        } else {
          this.saving = false;
        }
      },
      error: (err) => {
        console.error('Error clearing selections', err);
        this.saving = false;
      }
    });
  }

  deselectAll(): void {
    if (!this.track || !this.date || !this.raceId) return;

    if (confirm('Are you sure you want to deselect all horses?')) {
      this.raceService.clearSelections(this.track, this.date, this.raceId).subscribe({
        next: () => {
          this.selectedHorses.clear();
        },
        error: (err) => console.error('Error clearing selections', err)
      });
    }
  }

  private navigateToRace(newId: number): void {
    this.router.navigate(['/analysis', newId], {
      queryParams: { track: this.track, date: this.date }
    });
  }
}
