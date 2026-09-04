ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS simulated boolean NOT NULL DEFAULT false;

DELETE FROM public.live_locations;
DELETE FROM public.buses;
DELETE FROM public.routes;

INSERT INTO public.routes (id, name, stops) VALUES
('11111111-1111-1111-1111-111111111111', '500D — Silk Board to Hebbal (ORR)', '[
 {"name":"Central Silk Board","lat":12.9172,"lng":77.6229},
 {"name":"HSR Layout","lat":12.9116,"lng":77.6412},
 {"name":"Agara","lat":12.9227,"lng":77.6416},
 {"name":"Ibbalur","lat":12.9268,"lng":77.6480},
 {"name":"Bellandur","lat":12.9304,"lng":77.6784},
 {"name":"Marathahalli Bridge","lat":12.9569,"lng":77.7011},
 {"name":"Doddanekundi","lat":12.9784,"lng":77.6960},
 {"name":"Mahadevapura","lat":12.9903,"lng":77.6890},
 {"name":"KR Puram Tin Factory","lat":12.9982,"lng":77.6784},
 {"name":"Hennur Cross","lat":13.0300,"lng":77.6410},
 {"name":"Hebbal","lat":13.0358,"lng":77.5970}
]'::jsonb),
('22222222-2222-2222-2222-222222222222', '335E — Majestic to ITPL Whitefield', '[
 {"name":"Kempegowda Bus Station (Majestic)","lat":12.9774,"lng":77.5726},
 {"name":"Shivajinagar","lat":12.9843,"lng":77.6046},
 {"name":"Ulsoor","lat":12.9789,"lng":77.6206},
 {"name":"Indiranagar","lat":12.9719,"lng":77.6412},
 {"name":"Domlur","lat":12.9615,"lng":77.6385},
 {"name":"Marathahalli","lat":12.9569,"lng":77.7011},
 {"name":"Kundalahalli Gate","lat":12.9663,"lng":77.7167},
 {"name":"ITPL Whitefield","lat":12.9856,"lng":77.7367}
]'::jsonb),
('33333333-3333-3333-3333-333333333333', '210 — Banashankari to Kanakapura Road', '[
 {"name":"Banashankari TTMC","lat":12.9250,"lng":77.5468},
 {"name":"Yelachenahalli","lat":12.8951,"lng":77.5680},
 {"name":"Konanakunte Cross","lat":12.8828,"lng":77.5695},
 {"name":"Vajarahalli","lat":12.8687,"lng":77.5620},
 {"name":"Thalaghattapura","lat":12.8578,"lng":77.5474},
 {"name":"Anjanapura Township","lat":12.8592,"lng":77.5620}
]'::jsonb);

INSERT INTO public.buses (id, bus_number, route_id, simulated) VALUES
('aaaaaaaa-1111-1111-1111-111111111111','KA-01-F-500D', '11111111-1111-1111-1111-111111111111', true),
('aaaaaaaa-2222-2222-2222-222222222222','KA-01-F-335E', '22222222-2222-2222-2222-222222222222', true),
('aaaaaaaa-3333-3333-3333-333333333333','KA-01-F-2100', '33333333-3333-3333-3333-333333333333', true),
('bbbbbbbb-1111-1111-1111-111111111111','KA-01-F-5001', '11111111-1111-1111-1111-111111111111', false),
('bbbbbbbb-2222-2222-2222-222222222222','KA-01-F-3352', '22222222-2222-2222-2222-222222222222', false),
('bbbbbbbb-3333-3333-3333-333333333333','KA-01-F-2101', '33333333-3333-3333-3333-333333333333', false);