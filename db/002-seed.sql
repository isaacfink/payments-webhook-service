insert into accounts (id, name, currency, balance_cents) values
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c001', 'Northwind Trading',   'USD', 1250000),
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c002', 'Contoso Logistics',   'USD',  480050),
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c003', 'Fabrikam Retail',     'USD',       0),
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c004', 'Tailspin Toys GmbH',  'EUR',  902375);

insert into transactions (account_id, settlement_id, reference, amount_cents, created_at) values
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c001', 'stl_2024_11_28_a', 'ch_9fd21ab', 320000, now() - interval '9 days'),
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c001', 'stl_2024_12_02_a', 'ch_1c8e740',  85500, now() - interval '5 days'),
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c002', 'stl_2024_12_02_a', 'ch_44b0e19', 120050, now() - interval '5 days'),
  ('3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c004', 'stl_2024_12_04_b', 'ch_7ae3390', 210000, now() - interval '3 days');
