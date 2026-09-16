import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DocumentPreview } from './document-preview';

export const previewUrl = (fixture: ComponentFixture<unknown>): string | undefined =>
  fixture.debugElement.query(By.directive(DocumentPreview))?.componentInstance.url();
