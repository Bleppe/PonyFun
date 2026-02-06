import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { RaceAnalysisComponent } from './components/race-analysis/race-analysis';
import { RiderAnalysisComponent } from './components/rider-analysis/rider-analysis';
import { RaceRiderAnalysisComponent } from './components/race-rider-analysis/race-rider-analysis';

export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'analysis/:id', component: RaceAnalysisComponent },
    { path: 'riders', component: RiderAnalysisComponent },
    { path: 'rider-analysis/:id', component: RaceRiderAnalysisComponent }
];
