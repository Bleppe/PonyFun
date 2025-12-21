import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard';
import { RaceAnalysisComponent } from './components/race-analysis/race-analysis';

export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'analysis/:id', component: RaceAnalysisComponent }
];
