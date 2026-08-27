INSERT INTO public.routes (id, name, stops) VALUES
('33333333-3333-3333-3333-333333333333', 'Route 21 — Lake Ring', '[{"name":"Ulsoor Lake","lat":12.9819,"lng":77.6205},{"name":"Trinity Circle","lat":12.9726,"lng":77.6199},{"name":"Richmond Circle","lat":12.9601,"lng":77.5960},{"name":"Lalbagh West Gate","lat":12.9507,"lng":77.5848},{"name":"South End Circle","lat":12.9350,"lng":77.5800}]'::jsonb),
('44444444-4444-4444-4444-444444444444', 'Route 5 — Tech Park Shuttle', '[{"name":"Majestic Bus Station","lat":12.9776,"lng":77.5713},{"name":"Rajajinagar","lat":12.9911,"lng":77.5527},{"name":"Yeshwanthpur","lat":13.0230,"lng":77.5540},{"name":"Peenya Industrial Area","lat":13.0290,"lng":77.5190}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buses (id, bus_number, route_id) VALUES
('aaaaaaaa-3333-3333-3333-333333333333', 'KA-01-F-2101', '33333333-3333-3333-3333-333333333333'),
('aaaaaaaa-3333-3333-3333-333333333334', 'KA-01-F-2102', '33333333-3333-3333-3333-333333333333'),
('aaaaaaaa-4444-4444-4444-444444444444', 'KA-01-F-0501', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO NOTHING;