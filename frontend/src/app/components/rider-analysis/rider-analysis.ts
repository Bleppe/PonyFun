import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RaceService } from '../../services/race';

@Component({
    selector: 'app-rider-analysis',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './rider-analysis.html',
    styleUrl: './rider-analysis.css',
})
export class RiderAnalysisComponent implements OnInit {
    topRiders: any[] = [];
    loading = false;

    constructor(private raceService: RaceService) { }

    ngOnInit(): void {
        this.loadTopRiders();
    }

    loadTopRiders(): void {
        this.loading = true;
        this.raceService.getTopRiders().subscribe({
            next: (data) => {
                this.topRiders = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading top riders', err);
                this.loading = false;
            }
        });
    }

    refreshTopRiders(): void {
        this.loading = true;
        this.raceService.fetchToplists().subscribe({
            next: () => {
                this.loadTopRiders();
            },
            error: (err) => {
                console.error('Error refreshing top riders', err);
                this.loading = false;
            }
        });
    }
}
