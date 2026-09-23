-- Migration: 007_teacher_erapor_pin.sql
-- Description: Add erapor_pin_hash column to teachers table for e-Rapor PIN authentication

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS erapor_pin_hash TEXT;

COMMENT ON COLUMN public.teachers.erapor_pin_hash IS 'SHA-256 hash PIN e-Rapor guru';
