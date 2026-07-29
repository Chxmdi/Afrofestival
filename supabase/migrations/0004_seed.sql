-- =====================================================================
-- SAMPLE seed data. Every row carries is_sample = true so the UI can
-- clearly distinguish demonstration records from real operational data.
-- Compliance placeholders are flagged needs_verification = true.
-- =====================================================================

-- Event & settings -----------------------------------------------------
insert into public.events (id, name, slug, tagline, provisional_date, backup_date, location, capacity_target, is_sample)
values ('11111111-1111-1111-1111-111111111111',
        'Ojoro Afro Football & Culture Festival',
        'ojoro-2027',
        'Where the beautiful game meets Black culture — Montréal 2027',
        '2027-07-17','2027-07-24','Montréal, Québec', 600, true)
on conflict (id) do nothing;

insert into public.event_settings (event_id, key, value, description) values
  ('11111111-1111-1111-1111-111111111111','tournament',
   '{"teams":16,"groups":4,"players_min":10,"players_max":12,"pitches":4,"slot_minutes":30,"max_player_fee":45}','Tournament format'),
  ('11111111-1111-1111-1111-111111111111','finance',
   '{"currency":"CAD","working_budget":55500,"sponsor_cash_goal":32000,"sponsor_inkind_goal":10000,"max_player_fee":45,"max_ticket_price":45}','Finance targets'),
  ('11111111-1111-1111-1111-111111111111','tiebreakers',
   '["points","goal_diff","goals_for","head_to_head","fair_play"]','Configurable standings tie-breakers')
on conflict (event_id, key) do nothing;

-- Sponsor match signals ------------------------------------------------
insert into public.sponsor_match_signals (key,label,weight,category,description) values
  ('black_culture','Black culture & community alignment',30,'mission','Brand actively supports Black communities and culture'),
  ('football','Football / sports alignment',20,'mission','Connection to grassroots or community sport'),
  ('montreal','Montréal / Québec relevance',20,'geo','Local presence or Québec market focus'),
  ('youth','Youth & community impact',15,'mission','Invests in youth development and community impact'),
  ('previous_sponsorship','Previous sponsorship evidence',10,'proof','Has publicly sponsored comparable events'),
  ('local_business','Local business capacity',5,'proof','Established local business able to commit budget')
on conflict (key) do nothing;

-- Sponsor packages -----------------------------------------------------
insert into public.sponsor_packages (id,name,tier_rank,cash_amount,inkind_value,slots,benefits,description,is_sample) values
  ('a0000000-0000-0000-0000-000000000001','Title Partner',1,15000,3000,1,'["Naming rights","Main stage branding","Centre pitch branding","20 VIP passes"]','Presenting partner of the festival',true),
  ('a0000000-0000-0000-0000-000000000002','Champion',2,8000,1500,2,'["Pitch branding","Programme feature","10 VIP passes"]','Major supporter tier',true),
  ('a0000000-0000-0000-0000-000000000003','Community',3,3500,750,4,'["Zone branding","Social features","6 passes"]','Community partner tier',true),
  ('a0000000-0000-0000-0000-000000000004','Supporter',4,1500,0,8,'["Logo placement","2 passes"]','Entry supporter tier',true),
  ('a0000000-0000-0000-0000-000000000005','In-Kind Partner',5,0,2500,10,'["Product placement","Logo placement"]','Goods & services partner',true)
on conflict (id) do nothing;

-- Sponsor prospects ----------------------------------------------------
insert into public.sponsor_prospects
  (name,website,domain,industry,location,description,stage,match_score,score_breakdown,
   align_black_culture,align_football,align_montreal,align_youth,previous_sponsorship_evidence,
   suggested_package_id,suggested_ask,estimated_capacity,probability,next_action,next_action_date,
   proposal_status,contract_status,commitment_type,internal_notes,is_sample)
values
  ('Desjardins','https://desjardins.com','desjardins.com','Financial Services','Lévis, QC',
   'Québec cooperative financial group with strong community reinvestment mandate.','proposal_sent',88,
   '{"black_culture":24,"football":16,"montreal":20,"youth":14,"previous_sponsorship":9,"local_business":5}',
   80,75,100,90,'Long history of sponsoring Montréal community & youth sport.',
   'a0000000-0000-0000-0000-000000000001',15000,20000,0.55,'Follow up on proposal','2026-08-10',
   'sent','in_review','cash','Warm intro via community foundation.',true),
  ('Maison Publique Média','https://example-media.ca','example-media.ca','Media','Montréal, QC',
   'Independent Montréal media house covering Afro-Caribbean culture.','negotiation',82,
   '{"black_culture":28,"football":10,"montreal":20,"youth":11,"previous_sponsorship":8,"local_business":5}',
   95,45,100,70,'Media partner for two prior culture festivals.',
   'a0000000-0000-0000-0000-000000000005',0,8000,0.7,'Finalise in-kind media package','2026-08-05',
   'sent','in_negotiation','in_kind','Offering ad inventory + coverage.',true),
  ('Boreal Sportswear','https://example-sport.ca','example-sport.ca','Apparel / Retail','Montréal, QC',
   'Montréal athletic apparel brand focused on community teams.','verbal_yes',79,
   '{"black_culture":18,"football":20,"montreal":18,"youth":13,"previous_sponsorship":6,"local_business":4}',
   60,100,90,85,'Kits several amateur football clubs in Québec.',
   'a0000000-0000-0000-0000-000000000002',8000,10000,0.8,'Send contract','2026-08-01',
   'accepted','pending','mixed','Kit supply + cash. Wants pitch branding.',true),
  ('Café Kaló','https://example-cafe.ca','example-cafe.ca','Food & Beverage','Montréal, QC',
   'Black-owned specialty coffee roaster in Little Burgundy.','contracted',74,
   '{"black_culture":30,"football":8,"montreal":20,"youth":8,"previous_sponsorship":4,"local_business":4}',
   100,30,100,55,'Sponsored neighbourhood tournaments in 2024–25.',
   'a0000000-0000-0000-0000-000000000003',3500,4000,0.95,'Deliver activation plan','2026-07-30',
   'accepted','signed','cash','Signed. Beverage activation in food village.',true),
  ('Loto-Québec','https://example-lotoqc.ca','example-lotoqc.ca','Public Corporation','Montréal, QC',
   'Provincial corporation with community events grant stream.','contacted',68,
   '{"black_culture":14,"football":12,"montreal":20,"youth":12,"previous_sponsorship":6,"local_business":4}',
   45,55,100,70,'Grants to Québec festivals.','a0000000-0000-0000-0000-000000000002',8000,12000,0.3,
   'Await reply to intro email','2026-08-15','none','none','cash','Applied via community grant portal.',true),
  ('Groupe Barbier MTL','https://example-barber.ca','example-barber.ca','Beauty / Grooming','Montréal, QC',
   'Barbershop collective spanning Montréal-Nord and Saint-Michel.','qualified',71,
   '{"black_culture":30,"football":6,"montreal":20,"youth":11,"previous_sponsorship":0,"local_business":4}',
   100,25,95,75,'None found — first-time prospect.','a0000000-0000-0000-0000-000000000004',1500,2500,0.2,
   'Identify main contact','2026-08-20','none','none','in_kind','Perfect fit for barber arena.',true),
  ('Metro Inc.','https://example-metro.ca','example-metro.ca','Grocery / Retail','Montréal, QC',
   'Major Québec grocery retailer with community giving programme.','researching',58,
   '{"black_culture":10,"football":8,"montreal":20,"youth":12,"previous_sponsorship":5,"local_business":3}',
   35,35,100,70,'Community giving programme active.','a0000000-0000-0000-0000-000000000003',3500,8000,0.15,
   'Research CSR contact','2026-08-25','none','none','mixed',null,true),
  ('Fondation Klub','https://example-klub.ca','example-klub.ca','Nonprofit','Montréal, QC',
   'Foundation funding Afro-diaspora youth arts and sport.','ready_to_contact',85,
   '{"black_culture":30,"football":15,"montreal":20,"youth":15,"previous_sponsorship":0,"local_business":5}',
   100,70,100,100,'Grant recipient list overlaps our mission.','a0000000-0000-0000-0000-000000000003',3500,5000,0.25,
   'Send inquiry email','2026-08-12','none','none','cash','High-alignment grantor.',true);

-- Sponsor commitments & invoices ---------------------------------------
insert into public.sponsor_commitments (prospect_id, package_id, commitment_type, cash_amount, inkind_value, status, agreed_at, is_sample)
select id, 'a0000000-0000-0000-0000-000000000003','cash',3500,750,'contracted','2026-07-15',true
from public.sponsor_prospects where name='Café Kaló';

insert into public.sponsor_commitments (prospect_id, package_id, commitment_type, cash_amount, inkind_value, status, agreed_at, is_sample)
select id, 'a0000000-0000-0000-0000-000000000002','mixed',8000,1500,'verbal','2026-07-20',true
from public.sponsor_prospects where name='Boreal Sportswear';

insert into public.sponsor_commitments (prospect_id, commitment_type, cash_amount, inkind_value, status, agreed_at, is_sample)
select id,'in_kind',0,8000,'verbal','2026-07-18',true
from public.sponsor_prospects where name='Maison Publique Média';

insert into public.sponsor_invoices (prospect_id, invoice_number, amount, issued_date, due_date, status, is_sample)
select id,'SP-2027-001',3500,'2026-07-16','2026-08-16','partial',true
from public.sponsor_prospects where name='Café Kaló';

-- Sponsor discovery sample run -----------------------------------------
insert into public.sponsor_discovery_runs (id,label,keywords,location_filters,industry_filters,required_signals,
  excluded_industries,min_ask,max_ask,result_limit,provider,status,results_found,records_created,started_at,completed_at,is_sample)
values ('d0000000-0000-0000-0000-000000000001','Montréal Black-owned & community brands',
  array['community sponsorship','Black-owned Montréal','youth football'],
  array['Montréal','Québec'], array['Retail','Food & Beverage','Financial Services'],
  array['black_culture','montreal','youth'], array['Tobacco','Gambling'],
  1500,15000,20,'sample','completed',3,0,'2026-07-20 14:00-04','2026-07-20 14:03-04',true)
on conflict (id) do nothing;

insert into public.sponsor_discovery_results (run_id,organization_name,domain,website,description,industry,location,
  community_page_url,public_contact,sponsorship_evidence,source_urls,match_score,score_breakdown,approval_status,is_sample) values
  ('d0000000-0000-0000-0000-000000000001','Marché du Nord','marchedunord.example.ca','https://marchedunord.example.ca',
   'Independent grocer serving Montréal-Nord with a community fund.','Grocery / Retail','Montréal-Nord, QC',
   'https://marchedunord.example.ca/communaute','{"email":"info@marchedunord.example.ca"}',
   'Community fund page lists past neighbourhood sport donations.',
   array['https://marchedunord.example.ca/communaute'],76,
   '{"black_culture":22,"football":10,"montreal":20,"youth":14,"previous_sponsorship":6,"local_business":4}','pending',true),
  ('d0000000-0000-0000-0000-000000000001','Studio Diaspora','studiodiaspora.example.ca','https://studiodiaspora.example.ca',
   'Creative studio celebrating Afro-Caribbean identity in Québec.','Media / Creative','Montréal, QC',
   'https://studiodiaspora.example.ca/partners','{"email":"hello@studiodiaspora.example.ca"}',
   'Partners page shows festival collaborations.',
   array['https://studiodiaspora.example.ca/partners'],81,
   '{"black_culture":28,"football":8,"montreal":20,"youth":11,"previous_sponsorship":8,"local_business":6}','pending',true),
  ('d0000000-0000-0000-0000-000000000001','Jollof Kitchen Co','jollofkitchen.example.ca','https://jollofkitchen.example.ca',
   'West-African catering company active at Montréal cultural events.','Food & Beverage','Montréal, QC',
   'https://jollofkitchen.example.ca/events','{"email":"catering@jollofkitchen.example.ca"}',
   'Events page references sponsoring a 2025 street festival.',
   array['https://jollofkitchen.example.ca/events'],72,
   '{"black_culture":26,"football":6,"montreal":20,"youth":9,"previous_sponsorship":7,"local_business":4}','pending',true);

insert into public.sponsor_discovery_sources (result_id,url,title,excerpt,signal)
select r.id,'https://'||r.domain||'/communaute','Community',
  'Our community fund supports local youth sport and cultural gatherings.','black_culture'
from public.sponsor_discovery_results r where r.organization_name='Marché du Nord';

-- Vendor categories ----------------------------------------------------
insert into public.vendor_categories (key,label,sort_order) values
  ('food','Food',1),('beverage','Beverage',2),('fashion','Fashion',3),('beauty','Beauty',4),
  ('hair_barber','Hair & Barbering',5),('art','Art',6),('jewellery','Jewellery',7),
  ('community','Community',8),('media','Media',9),('other','Other',10)
on conflict (key) do nothing;

-- Vendors & applications ----------------------------------------------
insert into public.vendors (legal_name,trading_name,category_id,black_owned,african_caribbean,description,status,review_score,vendor_fee,deposit,invoice_status,contract_status,logistics_ready,is_sample)
select v.legal_name,v.trading_name,c.id,v.black_owned,v.afc,v.descr,v.status::vendor_status,v.score,v.fee,v.dep,v.inv::payment_status,v.contract,v.ready,true
from (values
  ('9245-1123 Québec Inc.','Jollof Kitchen Co','food',true,true,'West-African street food',   'approved',88,350,100,'paid','signed',true),
  ('Café Kaló Roasters','Café Kaló','beverage',true,false,'Specialty coffee & cold brew',      'approved',85,300,100,'partial','signed',true),
  ('Wax & Thread','Wax & Thread','fashion',true,true,'Ankara-inspired streetwear',              'approved',80,300,100,'unpaid','pending',false),
  ('Fresh Fades Collective','Fresh Fades','hair_barber',true,true,'Live barber arena',            'approved',90,250,50,'paid','signed',true),
  ('Diaspora Prints','Diaspora Prints','art',true,true,'Prints & visual art',                     'under_review',70,250,0,'unpaid','none',false),
  ('Island Sips','Island Sips','beverage',true,true,'Caribbean drinks & juices',                 'waitlisted',65,300,0,'unpaid','none',false),
  ('Sculptée Bijoux','Sculptée','jewellery',true,false,'Handmade jewellery',                     'submitted',0,250,0,'unpaid','none',false)
) as v(legal_name,trading_name,cat,black_owned,afc,descr,status,score,fee,dep,inv,contract,ready)
join public.vendor_categories c on c.key = v.cat;

-- Documents for approved vendors; some missing/expiring
insert into public.vendor_documents (vendor_id,doc_type,status,expiry_date)
select v.id, d.doc_type, d.status::doc_status, d.expiry
from public.vendors v
cross join lateral (values
       ('Liability Insurance','valid','2027-12-31'::date),
       ('MAPAQ Permit','submitted',null::date)
     ) as d(doc_type,status,expiry)
where v.trading_name in ('Jollof Kitchen Co','Café Kaló');
-- A vendor deliberately missing docs (drives "vendors missing documents" metric)
insert into public.vendor_documents (vendor_id,doc_type,status,expiry_date)
select v.id,'Liability Insurance','missing',null from public.vendors v where v.trading_name='Wax & Thread';

-- Vendor applications intake queue
insert into public.vendor_applications (legal_name,trading_name,contact_name,email,phone,category,black_owned,african_caribbean,menu_products,tent_needs,table_needs,electricity_needs,water_needs,propane_cooking,food_permit,insurance,status,submission_source,is_sample)
values
  ('Mama Efua Foods','Mama Efua','Efua Mensah','efua@example.ca','514-555-0110','food',true,true,'Jollof, suya, plantain','10x10 tent',2,'2x 20A',true,true,false,false,'submitted','public_form',true),
  ('Kompa Cuts','Kompa Cuts','Jean Baptiste','jb@example.ca','514-555-0120','hair_barber',true,true,'Cuts & line-ups','Shared',1,'1x 15A',false,false,false,true,'under_review','public_form',true),
  ('Sahel Textiles','Sahel','Awa Diallo','awa@example.ca','514-555-0130','fashion',true,true,'Fabrics & bags','10x10 tent',3,'None',false,false,false,false,'submitted','public_form',true);

-- Venues ---------------------------------------------------------------
insert into public.venues (name,address,capacity,suitable_pitches,indoor_outdoor,availability,cost,deposit,transit_access,parking,accessibility,alcohol_rules,curfew,rain_plan,overall_score,status,is_sample) values
  ('Complexe Sportif Marie-Victorin','Montréal, QC',800,4,'outdoor','Jul 17 & 24 available',12000,3000,'Metro + bus 20 min','On-site lot','Wheelchair accessible','SAQ permit required','23:00','Covered gym backup',86,'shortlisted',true),
  ('Parc Jarry Fields','Montréal, QC',1000,3,'outdoor','Jul 17 pending city permit',9000,2000,'Metro De Castelnau','Street + lot','Accessible paths','No alcohol without permit','22:00','No indoor backup',72,'considering',true),
  ('Stade Hébert','Montréal, QC',600,4,'both',' Backup date only',10500,2500,'Bus only','Small lot','Partially accessible','Permit required','23:00','Indoor courts',78,'considering',true);

insert into public.venue_quotes (venue_id,amount,valid_until,notes)
select id,12000,'2026-09-01','Full-day rate incl. 4 pitches + gym backup' from public.venues where name like 'Complexe Sportif%';

-- Site zones -----------------------------------------------------------
insert into public.site_zones (name,zone_type,description,sort_order,is_sample) values
  ('Pitch 1','pitch','Group stage & knockout pitch',1,true),
  ('Pitch 2','pitch','Group stage pitch',2,true),
  ('Pitch 3','pitch','Group stage pitch',3,true),
  ('Pitch 4','pitch','Group stage pitch',4,true),
  ('Main Stage','stage','Afrobeats & Amapiano performances',5,true),
  ('Food Village','food','Vendor food court',6,true),
  ('Retail Marketplace','retail','Fashion, art & jewellery vendors',7,true),
  ('Barber Arena','activation','Live barbering & grooming',8,true),
  ('Art Area','art','Visual art & live painting',9,true),
  ('Sponsor Village','sponsor','Partner activations',10,true),
  ('Community Zone','community','Nonprofits & community groups',11,true),
  ('First Aid','safety','Medical station',12,true),
  ('Command Centre','ops','Event operations HQ',13,true),
  ('Staff Area','ops','Staff & volunteer base',14,true),
  ('Entrances','access','Ticketing & entry gates',15,true),
  ('Emergency Access','access','Emergency vehicle lane',16,true);

-- Budget: recommended scenario totalling ~CAD $55,500 ------------------
do $b$
declare cat_id uuid;
begin
  -- Expense categories & items
  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Venue & Pitches','expense','recommended',1,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Venue rental (4 pitches)',12000,12000,12000,3000,3000,12000,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Insurance & Permits','expense','recommended',2,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Liability insurance & permits',3500,3500,1200,0,0,3500,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Security & First Aid','expense','recommended',3,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Security team + medical',4500,4200,0,0,0,4500,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Stage, Sound & AV','expense','recommended',4,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Stage, PA, lighting, generator',6500,6800,2000,0,0,6800,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Tournament Operations','expense','recommended',5,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Referees, balls, nets, medals',3200,3200,800,0,0,3200,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Performers & DJs','expense','recommended',6,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Artist & DJ fees',5000,5000,1500,0,0,5000,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Marketing & Content','expense','recommended',7,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Design, ads, photo/video',4800,4600,900,0,0,4600,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Site Infrastructure','expense','recommended',8,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Tents, tables, power, fencing',6000,6300,0,0,0,6300,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Staff & Volunteers','expense','recommended',9,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Meals, shirts, transport',2500,2500,0,0,0,2500,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Signage & Branding','expense','recommended',10,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Banners, wayfinding, backdrops',2500,2500,0,0,0,2500,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Sanitation & Waste','expense','recommended',11,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'Washrooms, waste, cleanup',2000,2000,0,0,0,2000,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Contingency','expense','recommended',12,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,quoted_amount,committed_amount,invoiced_amount,paid_amount,forecast_amount,is_sample) values
   (cat_id,'10% contingency reserve',3000,3000,0,0,0,3000,true);

  -- Revenue categories & items
  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Sponsorship','revenue','recommended',1,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,forecast_amount,committed_amount,is_sample) values
   (cat_id,'Cash sponsorship',32000,26000,11500,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Ticket Sales','revenue','recommended',2,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,forecast_amount,is_sample) values
   (cat_id,'Attendee tickets (cap $45)',9000,7200,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Team Registrations','revenue','recommended',3,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,forecast_amount,is_sample) values
   (cat_id,'16 teams registration',7200,6300,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Vendor Fees','revenue','recommended',4,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,forecast_amount,is_sample) values
   (cat_id,'Vendor booth fees',4500,3800,true);

  insert into public.budget_categories (name,kind,scenario,sort_order,is_sample)
  values ('Grants & Donations','revenue','recommended',5,true) returning id into cat_id;
  insert into public.budget_items (category_id,name,planned_amount,forecast_amount,is_sample) values
   (cat_id,'Community grants & donations',3000,2000,true);
end $b$;

-- Revenues (ledger) ----------------------------------------------------
insert into public.revenues (source_type,description,amount,status,expected_date,is_in_kind,is_sample) values
  ('sponsors','Café Kaló — Community package',3500,'received','2026-07-16',false,true),
  ('sponsors','Boreal Sportswear — verbal',8000,'committed','2026-08-01',false,true),
  ('sponsors','Maison Publique Média — in-kind',8000,'committed','2026-08-05',true,true),
  ('team_registrations','Team registrations (paid)',3150,'received',null,false,true),
  ('tickets','Early-bird tickets',1200,'received',null,false,true),
  ('vendors','Vendor fees collected',900,'received',null,false,true);

-- Expenses -------------------------------------------------------------
insert into public.expenses (description,amount,expense_date,category,approval_status,payment_status,is_in_kind,is_sample) values
  ('Venue deposit — Complexe Sportif',3000,'2026-07-10','Venue','approved','paid',false,true),
  ('Stage & PA deposit',2000,'2026-07-18','Production','approved','paid',false,true),
  ('Referee retainer',800,'2026-07-20','Tournament','approved','partial',false,true),
  ('Logo & brand kit',900,'2026-07-05','Marketing','approved','paid',false,true),
  ('Insurance down payment',1200,'2026-07-22','Insurance','pending','unpaid',false,true);

-- Milestones (phases) --------------------------------------------------
insert into public.milestones (title,phase,target_date,status,sort_order,is_sample) values
  ('Venue confirmed & deposit paid','Foundation & Venue','2026-09-15','on_track',1,true),
  ('Sponsorship deck & packages live','Sponsorship','2026-08-15','on_track',2,true),
  ('First 8 sponsors contacted','Sponsorship','2026-09-01','at_risk',3,true),
  ('Vendor & talent applications open','Vendor & Talent Recruitment','2026-09-01','upcoming',4,true),
  ('12 of 16 teams registered','Tournament Registration','2027-04-01','upcoming',5,true),
  ('All permits submitted','Permits & Production','2027-05-01','upcoming',6,true),
  ('Marketing launch','Marketing Launch','2027-03-01','upcoming',7,true),
  ('Final ops walkthrough','Final Operations','2027-07-10','upcoming',8,true),
  ('Event day','Event Day','2027-07-17','upcoming',9,true),
  ('Post-event sponsor report','Post-Event Reporting','2027-08-15','upcoming',10,true);

-- Tasks ----------------------------------------------------------------
insert into public.tasks (title,description,department,phase,status,priority,start_date,due_date,estimated_cost,on_critical_path,is_blocker,is_sample) values
  ('Confirm venue & sign contract','Finalise Complexe Sportif booking','Operations','Foundation & Venue','in_progress','critical','2026-07-15','2026-09-10',12000,true,false,true),
  ('Finalise sponsorship packages','Lock tiers & benefits','Sponsorship','Sponsorship','done','high','2026-07-01','2026-07-25',0,false,false,true),
  ('Build sponsor prospect list (50)','Discovery + manual research','Sponsorship','Sponsorship','in_progress','high','2026-07-20','2026-08-20',0,true,false,true),
  ('Send first 8 sponsor proposals','Prioritise high-match prospects','Sponsorship','Sponsorship','todo','high','2026-08-01','2026-08-25',0,false,false,true),
  ('Open vendor applications','Publish public form','Vendors','Vendor & Talent Recruitment','todo','medium','2026-08-15','2026-09-01',0,false,false,true),
  ('Draft player waiver & rules','Legal review needed','Tournament','Tournament Registration','blocked','high','2026-08-01','2026-08-20',0,false,true,true),
  ('Submit city park & noise permits','Depends on venue confirmation','Compliance','Permits & Production','todo','critical','2027-01-15','2027-05-01',500,true,false,true),
  ('Marketing launch campaign','Brand reveal + team announcements','Marketing','Marketing Launch','todo','medium','2027-02-15','2027-03-01',1500,false,false,true),
  ('Recruit 40 volunteers','Across all zones','Volunteers','Final Operations','todo','medium','2027-03-01','2027-06-15',0,false,false,true),
  ('Book performers & DJs','Confirm main stage lineup','Programme','Vendor & Talent Recruitment','in_progress','medium','2026-09-01','2026-11-30',5000,false,false,true),
  ('Event-day run sheet','Compile master run of show','Operations','Final Operations','todo','high','2027-06-15','2027-07-10',0,false,false,true),
  ('Post-event sponsor impact report','Fulfilment evidence + metrics','Sponsorship','Post-Event Reporting','todo','low','2027-07-18','2027-08-15',0,false,false,true);

-- Compliance placeholders (require official verification) ---------------
insert into public.compliance_requirements (requirement,authority,submission_deadline,status,fee,needs_verification,notes,is_sample) values
  ('Venue / field authorization','City of Montréal — Borough','2027-04-15','not_started',300,true,'SAMPLE placeholder — confirm exact borough process',true),
  ('Liability insurance certificate','Insurer / Broker','2027-05-01','not_started',0,true,'SAMPLE placeholder — verify coverage minimums',true),
  ('Food & vendor permits (temporary)','MAPAQ / City','2027-05-15','not_started',250,true,'SAMPLE placeholder — each food vendor must hold permit',true),
  ('Alcohol permit (if applicable)','RACJ (Régie)','2027-05-15','not_started',150,true,'SAMPLE placeholder — only if alcohol served',true),
  ('Music / SOCAN licensing','SOCAN / Ré:Sonne','2027-06-01','not_started',400,true,'SAMPLE placeholder — public performance tariff',true),
  ('Fire & safety review','Service de sécurité incendie','2027-06-01','not_started',0,true,'SAMPLE placeholder — site plan review',true),
  ('Sound / noise approval','Borough noise bylaw','2027-05-15','not_started',0,true,'SAMPLE placeholder — confirm curfew & levels',true),
  ('Emergency action plan','Internal + First Responders','2027-06-15','not_started',0,true,'SAMPLE placeholder — required before event',true);

-- Volunteer roles & volunteers -----------------------------------------
insert into public.volunteer_roles (name,description,headcount_needed,is_sample) values
  ('Gate & Ticketing','Entry, wristbands, scanning',6,true),
  ('Pitch Marshal','Team check-in & pitch flow',8,true),
  ('Food Village Support','Vendor assistance',4,true),
  ('Stage Crew','Artist liaison & changeovers',5,true),
  ('First Aid Support','Assist medical team',3,true),
  ('Info & Wayfinding','Guest questions',4,true);

do $v$
declare i int; rid uuid; ids uuid[]; vid uuid;
begin
  select array_agg(id) into ids from public.volunteer_roles;
  for i in 1..24 loop
    rid := ids[1 + (i % array_length(ids,1))];
    insert into public.volunteers (full_name,email,skills,availability,training_status,consent_given,role_id,status,is_sample)
    values ('Volunteer '||i,'volunteer'||i||'@example.ca',
            array['first-aid','bilingual']::text[],'Event day',
            (array['not_started','in_progress','complete'])[1+(i%3)],
            (i%4<>0), rid,
            (array['applied','approved','confirmed'])[1+(i%3)], true)
    returning id into vid;
  end loop;
end $v$;

-- Shifts (event day) & a few assignments
insert into public.shifts (title,starts_at,ends_at,slots_needed,is_sample) values
  ('Morning gate','2027-07-17 07:30-04','2027-07-17 12:00-04',4,true),
  ('Afternoon pitch marshals','2027-07-17 12:00-04','2027-07-17 17:00-04',8,true),
  ('Evening stage crew','2027-07-17 17:00-04','2027-07-17 23:00-04',5,true),
  ('First aid all-day','2027-07-17 08:00-04','2027-07-17 23:00-04',3,true);

insert into public.shift_assignments (shift_id,volunteer_id,status)
select s.id, v.id, 'confirmed'
from (select id from public.shifts order by starts_at limit 1) s
cross join lateral (select id from public.volunteers order by created_at limit 2) v;

-- Performers -----------------------------------------------------------
insert into public.performers (name,discipline,bio,fee,status,black_owned,is_sample) values
  ('DJ Layo','dj','Afrobeats & Amapiano selector',800,'confirmed',true,true),
  ('Kilele Dance Crew','dance_group','Afro-fusion dance collective',1200,'confirmed',true,true),
  ('Sena Poetics','spoken_word','Spoken-word artist',400,'invited',true,true),
  ('Amapiano Live Band','musician','Live amapiano ensemble',2000,'invited',true,true),
  ('FreestyleKing','freestyler','Football freestyle performer',600,'prospect',true,true),
  ('Atelier Nstandela','visual_artist','Live painting activation',500,'confirmed',true,true);

insert into public.performer_bookings (performer_id,contract_status,technical_needs,set_length_min,fee,payment_status,stage,is_sample)
select id,'signed','2x wireless mics, DI box',60,fee,'partial','Main Stage',true
from public.performers where name='DJ Layo';

-- Campaigns & content --------------------------------------------------
insert into public.campaigns (name,kind,status,start_date,end_date,goal,is_sample) values
  ('Brand Launch','brand_launch','planned','2027-03-01','2027-03-15','Reveal identity & date',true),
  ('Team Announcements','team_announcements','planned','2027-04-01','2027-05-15','Announce 16 teams',true),
  ('Culture Features','culture_features','planned','2027-04-15','2027-07-10','Highlight artists & vendors',true),
  ('Sponsor Announcements','sponsor_announcements','planned','2027-05-01','2027-07-01','Thank partners',true),
  ('Vendor Announcements','vendor_announcements','planned','2027-05-15','2027-07-10','Feature vendors',true),
  ('Performer Announcements','performer_announcements','planned','2027-05-15','2027-07-10','Reveal lineup',true),
  ('Countdown','countdown','planned','2027-07-01','2027-07-17','Daily countdown',true),
  ('Event-Day Content','event_day','planned','2027-07-17','2027-07-17','Live coverage',true),
  ('Post-Event Recap','post_event_recap','planned','2027-07-18','2027-08-01','Recap & thank-yous',true);

insert into public.content_items (campaign_id,title,channel,content_type,status,is_sample)
select id,'Announce festival date','Instagram','graphic','idea',true from public.campaigns where name='Brand Launch';

-- Awards ---------------------------------------------------------------
insert into public.awards (category,awarded,is_sample) values
  ('Champion',false,true),('Runner-up',false,true),('Third Place',false,true),
  ('MVP',false,true),('Golden Boot',false,true),('Best Goalkeeper',false,true),
  ('Fair Play',false,true),('Best Supporters',false,true),('Best Team Entrance',false,true);

-- Suppliers & equipment ------------------------------------------------
insert into public.suppliers (name,category,is_sample) values
  ('MTL Event Rentals','Infrastructure',true),('SonoPro AV','Production',true),('Kickoff Sports Supply','Tournament',true);

insert into public.equipment_items (name,category,quantity_needed,quantity_secured,unit_cost,status,is_sample) values
  ('10x10 tents',NULL,20,6,180,'sourced',true),
  ('Folding tables',NULL,40,10,25,'sourced',true),
  ('Match balls',NULL,16,0,35,'needed',true),
  ('Goal nets',NULL,8,0,60,'needed',true),
  ('Generators',NULL,3,1,450,'ordered',true);

-- Teams, players, groups, fixtures & standings -------------------------
do $t$
declare
  team_ids uuid[] := '{}';
  grp_ids  uuid[] := '{}';
  tid uuid; gid uuid; pid uuid;
  i int; g int; p int; rnd int;
  base timestamptz := '2027-07-17 09:00-04';
  names text[] := array['Little Burgundy FC','Côte-des-Neiges United','Parc-Ex Lions','Villeray Vipers',
    'Saint-Michel SC','Verdun Stars','NDG Rovers','Montréal-Nord Kings','Lachine Athletic','Hochelaga FC',
    'Rosemont Rangers','LaSalle City','Ahuntsic Union','Pointe-Claire FC','Anjou Eagles','Lasalle Diaspora'];
  reps text[] := array['Nigeria','Haiti','Bangladesh','Québec','DR Congo','Portugal','Jamaica','Algeria',
    'Ghana','Senegal','Cameroon','Morocco','Côte d''Ivoire','Somalia','Ethiopia','Guinea'];
  -- round-robin pairings for 4 teams (indices 1..4 within group)
  pair int[][] := array[array[1,4],array[2,3],array[1,3],array[4,2],array[1,2],array[3,4]];
begin
  for i in 1..16 loop
    insert into public.teams (name,represents,neighbourhood,captain_name,captain_email,manager_name,
      registration_status,payment_status,registration_fee,amount_paid,eligibility_ok,color_primary,color_secondary,is_sample)
    values (names[i],reps[i],split_part(names[i],' ',1),'Captain '||i,'captain'||i||'@example.ca','Manager '||i,
      case when i<=13 then 'approved' else 'pending' end,
      (case when i<=11 then 'paid' when i<=14 then 'partial' else 'unpaid' end)::payment_status,
      450, case when i<=11 then 450 when i<=14 then 200 else 0 end,
      i<=13,
      (array['#227d4f','#d75f24','#a02c4a','#c99a2c'])[1+(i%4)],
      (array['#0d0e10','#f6f0e4'])[1+(i%2)], true)
    returning id into tid;
    team_ids := array_append(team_ids, tid);

    for p in 1..10 loop
      insert into public.players (team_id,full_name,jersey_number,position,player_fee,payment_status,eligibility_ok,is_sample)
      values (tid,'Player '||p||' · '||names[i],p,
        (array['GK','DEF','MID','FWD'])[1+((p-1)%4)], 45,
        (case when (i+p)%3=0 then 'unpaid' else 'paid' end)::payment_status, i<=13, true)
      returning id into pid;
      insert into public.player_waivers (player_id,signed,signed_at,is_minor)
      values (pid, ((i*p)%3<>0), case when ((i*p)%3<>0) then now() end, false);
    end loop;
  end loop;

  -- 4 groups of 4
  for g in 1..4 loop
    insert into public.tournament_groups (name,sort_order,is_sample)
    values ('Group '||chr(64+g), g, true) returning id into gid;
    grp_ids := array_append(grp_ids, gid);
    for i in 1..4 loop
      insert into public.group_members (group_id,team_id,seed) values (gid, team_ids[(g-1)*4+i], i);
      insert into public.standings (group_id,team_id) values (gid, team_ids[(g-1)*4+i]);
    end loop;
  end loop;

  -- Group fixtures: 6 per group across 3 rounds, one pitch per group
  for g in 1..4 loop
    gid := grp_ids[g];
    for rnd in 1..3 loop
      for i in ((rnd-1)*2+1)..((rnd-1)*2+2) loop
        insert into public.fixtures (stage,group_id,round,pitch,kickoff,slot_index,home_team_id,away_team_id,status,is_sample)
        values ('group', gid, rnd, g,
          base + make_interval(mins => (rnd-1)*30), (rnd-1)*4+g,
          team_ids[(g-1)*4 + pair[i][1]], team_ids[(g-1)*4 + pair[i][2]], 'scheduled', true);
      end loop;
    end loop;
  end loop;

  -- Knockout bracket placeholders
  insert into public.fixtures (stage,round,pitch,kickoff,home_label,away_label,status,is_sample) values
   ('quarterfinal',1,1,base + interval '2 hours','Winner Group A','Runner-up Group B','scheduled',true),
   ('quarterfinal',1,2,base + interval '2 hours','Winner Group B','Runner-up Group A','scheduled',true),
   ('quarterfinal',1,3,base + interval '2 hours','Winner Group C','Runner-up Group D','scheduled',true),
   ('quarterfinal',1,4,base + interval '2 hours','Winner Group D','Runner-up Group C','scheduled',true),
   ('semifinal',1,1,base + interval '4 hours','Winner QF1','Winner QF2','scheduled',true),
   ('semifinal',1,2,base + interval '4 hours','Winner QF3','Winner QF4','scheduled',true),
   ('third_place',1,2,base + interval '6 hours','Loser SF1','Loser SF2','scheduled',true),
   ('final',1,1,base + interval '6 hours 30 minutes','Winner SF1','Winner SF2','scheduled',true);
end $t$;

-- Activity log ---------------------------------------------------------
insert into public.activity_logs (action,entity_type,summary,is_sample) values
  ('seed','system','Sample data loaded for demonstration',true),
  ('create','sponsor_prospect','Café Kaló moved to Contracted',true),
  ('create','vendor','Fresh Fades Collective approved',true),
  ('create','team','16 sample teams registered across 4 groups',true);
