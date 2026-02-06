import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { RaceService } from '../../services/race';

@Component({
    selector: 'app-race-rider-analysis',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './race-rider-analysis.html',
    styleUrl: './race-rider-analysis.css',
})
export class RaceRiderAnalysisComponent implements OnInit {
    analysis: any[] = [];
    raceId: number | null = null;
    track: string | null = null;
    date: string | null = null;
    loading = false;
    selectedHorses: Set<number> = new Set();
    saving = false;

    constructor(
        private route: ActivatedRoute,
        private raceService: RaceService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.raceId = +params['id'];
            this.route.queryParams.subscribe(queryParams => {
                this.track = queryParams['track'];
                this.date = queryParams['date'];
                if (this.raceId && this.track && this.date) {
                    this.loadAnalysis();
                    this.loadSelections();
                }
            });
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

    private navigateToRace(newId: number): void {
        this.router.navigate(['/rider-analysis', newId], {
            queryParams: { track: this.track, date: this.date }
        });
    }

    switchToAnalysis(): void {
        this.router.navigate(['/analysis', this.raceId], {
            queryParams: { track: this.track, date: this.date }
        });
    }

    loadAnalysis(): void {
        this.loading = true;
        if (this.raceId && this.track && this.date) {
            this.raceService.getRaceAnalysis(this.raceId, this.track, this.date).subscribe({
                next: (data) => {
                    this.analysis = data;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error loading rider analysis', err);
                    this.loading = false;
                }
            });
        }
    }

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
        if (this.selectedHorses.has(horseNumber)) {
            this.selectedHorses.delete(horseNumber);
        } else {
            this.selectedHorses.add(horseNumber);
        }
    }

    saveSelections(): void {
        if (!this.track || !this.date || !this.raceId) return;

        this.saving = true;
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
                    let completed = 0;
                    observables.forEach(obs => obs.subscribe({
                        next: () => {
                            completed++;
                            if (completed === observables.length) {
                                this.saving = false;
                                alert('Selections saved! 🏇');
                            }
                        },
                        error: () => this.saving = false
                    }));
                } else {
                    this.saving = false;
                    alert('All selections cleared! 🧹');
                }
            },
            error: (err) => {
                console.error('Error saving selections', err);
                this.saving = false;
            }
        });
    }

    deselectAll(): void {
        if (confirm('Are you sure you want to deselect all horses?')) {
            this.selectedHorses.clear();
        }
    }
}
