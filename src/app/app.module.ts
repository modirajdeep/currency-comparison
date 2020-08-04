import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";

import { AppComponent } from "./app.component";

import { MatTableModule } from "@angular/material/table";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDividerModule } from "@angular/material/divider";
import { MatListModule } from "@angular/material/list";
import { MatCardModule } from "@angular/material/card";
import { MatSelectModule } from "@angular/material/select";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatToolbarModule } from "@angular/material/toolbar";

import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { HttpClientModule } from "@angular/common/http";

import { OverlayModule } from "@angular/cdk/overlay";

import { ChartsModule } from "ng2-charts";

import { CurrencyFormatterPipe } from "./currency-formatter.pipe";

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatDividerModule,
    MatListModule,
    MatSelectModule,
    MatCardModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    HttpClientModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatButtonToggleModule,
    OverlayModule,
    MatToolbarModule,
    ChartsModule
  ],
  declarations: [AppComponent, CurrencyFormatterPipe],
  bootstrap: [AppComponent]
})
export class AppModule {}
