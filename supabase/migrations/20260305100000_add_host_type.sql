-- Add 'host' to the people type check constraint
alter table people drop constraint if exists people_type_check;
alter table people add constraint people_type_check
  check (type in ('artisan', 'guide', 'interpreter', 'host'));
