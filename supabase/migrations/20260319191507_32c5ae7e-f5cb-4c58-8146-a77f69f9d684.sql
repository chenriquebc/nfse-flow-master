
-- Limpar dados na ordem correta (respeitando foreign keys)
DELETE FROM nfse_events;
DELETE FROM nfse_invoices;
DELETE FROM certificates;
DELETE FROM companies;
DELETE FROM audit_logs;
DELETE FROM user_roles;
DELETE FROM tenant_members;
DELETE FROM tenants;
DELETE FROM profiles;
