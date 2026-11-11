# Implementation Plan - Lembar Analisis Soal Revisions

## User Requests & Proposed Solutions

### 1. Persistent Mode & Setup Navigation
- **Issue**: When switching modes or selecting a class, the top 3 mode selection cards (`Mode Wali Kelas`, `Mode Guru Bidang`, `Buka / Pulihkan`) disappear, requiring the user to close and reopen the modal to switch modes.
- **Solution**: Ensure the top 3 mode selection cards remain visible on the setup header or allow returning to mode selection at any point during setup, or keep them persistent at the top of the modal before active dashboard view.

### 2. Remove Bulky Workspace Banner
- **Issue**: The banner containing "WORKSPACE ANALISIS TERPADU" and introductory description takes up unnecessary space.
- **Solution**: Remove the workspace banner entirely and start the view directly with "1. SEKOLAH / LEMBAGA".

### 3. Compact "Buka / Pulihkan" View / Modal
- **Issue**: The "Buka / Pulihkan" UI options appear too large/bulky, leaving little space below.
- **Solution**: Redesign `RestoreAnalysisModal` to be extremely compact with 3 clean horizontal cards at the top (Import Excel, Tarik Analisis 6-Digit, Template Kosong), leaving the rest of the modal spacious and uncrowded.

## File Changes
- **`src/components/AnalisisSoalGeneratorModal.tsx`**:
  - Remove the workspace banner.
  - Make top mode selection cards persistently accessible or ensure switching between Wali Kelas and Guru Bidang keeps the setup accessible without disappearing.
- **`src/components/analysis/SessionSetupCard.tsx`**:
  - Refine layout so mode cards remain at the top when switching or configuring.
- **`src/components/analysis/RestoreAnalysisModal.tsx`**:
  - Compact the 3 options into sleek, clean top cards.
