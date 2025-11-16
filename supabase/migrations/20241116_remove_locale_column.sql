-- Remove locale column from profiles table as localization feature has been removed
alter table profiles drop column if exists locale;

