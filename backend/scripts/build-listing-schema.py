#!/usr/bin/env python3
"""
Writes backend/wp-content/plugins/travel-agency-core/data/listing-schema.json:
the 17 categories, their subtypes, the 7 listing types (booking methods), the
fields every listing has and the specialized fields of each category.

Edit this file, then run:  python3 backend/scripts/build-listing-schema.py

Field types:
  text, textarea, number, select, multiselect, boolean, list (one item per line),
  rows (repeatable rows with sub-fields), itinerary (day-by-day builder).
req: True = required, False = optional. show_if: {"field": key, "in"/"not_in": [values]} = conditional.
A category field with the same key as a common field replaces the common one for that category.
Field keys are post-meta keys; keys shared with older versions keep their meaning.
"""
import json
import os
import re


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower().replace('&', 'and')).strip('-')


def f(key, label, type='text', req=False, **kw):
    d = {'key': key, 'label': label, 'type': type, 'required': req}
    d.update(kw)
    return d


def opts(*labels):
    return [{'value': slug(l).replace('-', '_'), 'label': l} for l in labels]


def section(title, *fields, **kw):
    d = {'title': title, 'fields': list(fields)}
    d.update(kw)
    return d


CITIES = ['Marrakech', 'Fes', 'Casablanca', 'Rabat', 'Tangier', 'Chefchaouen', 'Essaouira', 'Agadir', 'Taghazout',
          'Ouarzazate', 'Merzouga', 'Errachidia', 'Zagora', 'Meknes', 'Dakhla', 'Imlil', 'Agafay', 'Other']
LANGUAGES = ['English', 'French', 'Spanish', 'Arabic', 'Amazigh', 'German', 'Italian', 'Portuguese', 'Dutch', 'Chinese']
WEEKDAYS = opts('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')

# ---------------------------------------------------------------- listing types

LISTING_TYPES = [
    {'key': 'multi_day', 'label': 'Multi-day package', 'booking': 'Date range, travellers, itinerary',
     'bookingFields': ['date', 'adults', 'children']},
    {'key': 'scheduled_excursion', 'label': 'Scheduled excursion', 'booking': 'Date, departure time, group size',
     'bookingFields': ['date', 'time', 'adults', 'children']},
    {'key': 'timed_activity', 'label': 'Timed activity', 'booking': 'Time slot, participants, equipment',
     'bookingFields': ['date', 'time', 'adults', 'children', 'option']},
    {'key': 'class_workshop', 'label': 'Class or workshop', 'booking': 'Session, seats, participant details',
     'bookingFields': ['date', 'time', 'adults', 'children']},
    {'key': 'experience_package', 'label': 'Experience package', 'booking': 'Package option, date, participants',
     'bookingFields': ['package', 'date', 'adults', 'children']},
    {'key': 'event_ticket', 'label': 'Event or ticket', 'booking': 'Event date, ticket type, ticket quantity',
     'bookingFields': ['eventDate', 'ticket', 'quantity']},
    {'key': 'transfer', 'label': 'Transfer or service', 'booking': 'Pickup time, route, passengers, vehicle',
     'bookingFields': ['date', 'time', 'pickup', 'dropoff', 'adults', 'flight', 'luggage']},
]

# ---------------------------------------------------------------- common fields (A–G)

COMMON = [
    section('Basic information',
        f('excerpt', 'Short summary (shown on cards)', 'textarea', True, max=200,
          help='One or two sentences, up to 200 characters.'),
        f('highlights', 'Highlights', 'list', True, help='One per line. 3 to 6 short points.'),
        # Stored as names ("English, French"), like tours saved by earlier versions.
        f('languages', 'Languages', 'multiselect', True, options=[{'value': l, 'label': l} for l in LANGUAGES]),
        f('tour_style', 'Group type', 'select', True, options=opts('Private', 'Shared group', 'Small group')),
        f('experience_style', 'Experience style', 'select', False, options=opts('Budget', 'Standard', 'Premium', 'Luxury')),
        f('traveler_types', 'Suitable for', 'multiselect', False, options=opts('Solo travellers', 'Couples', 'Families', 'Groups')),
        f('activity_level', 'Activity level', 'select', True, options=opts('Easy', 'Moderate', 'Challenging')),
        f('duration_type', 'Duration', 'select', True, options=opts('1–2 hours', 'Half day', 'Full day', 'Multiple days')),
        f('duration', 'Exact duration', 'text', True, placeholder='e.g. 3 hours, 4 days / 3 nights'),
        f('time_of_day', 'Time of day', 'multiselect', False, options=opts('Morning', 'Afternoon', 'Sunset', 'Evening', 'Overnight')),
        key='basic', step=2),
    section('Photos and media',
        f('video_url', 'Video link (YouTube or Vimeo)', 'text', False, placeholder='https://'),
        key='media', step=6, help='Cover photo and gallery are added with the photo uploader.'),
    section('Pricing and participants',
        f('currency', 'Currency', 'select', True, options=[{'value': c, 'label': c} for c in ('EUR', 'MAD', 'USD', 'GBP')]),
        f('price_unit', 'Price type', 'select', True, options=[
            {'value': 'per_person', 'label': 'per person'}, {'value': 'per_adult', 'label': 'per adult'},
            {'value': 'per_group', 'label': 'per group'}, {'value': 'per_vehicle', 'label': 'per vehicle'},
            {'value': 'per_session', 'label': 'per session'}, {'value': 'custom_quote', 'label': 'custom quote'}]),
        f('price', 'Adult price', 'number', True, show_if={'field': 'price_unit', 'not_in': ['custom_quote']}),
        f('child_price', 'Child price', 'number', False),
        f('child_ages', 'Child age band', 'text', False, placeholder='e.g. 4–11 years'),
        f('infant_policy', 'Infant policy', 'text', False, placeholder='e.g. Under 4 free, on a parent\'s lap'),
        f('min_participants', 'Minimum participants', 'number', False),
        f('group_size', 'Maximum participants', 'number', True),
        f('private_price', 'Private-group price', 'number', False),
        f('extras', 'Optional extras', 'rows', False, columns=[f('name', 'Extra'), f('price', 'Price', 'number')]),
        f('included', 'Included services', 'list', True, help='One per line.'),
        f('not_included', 'Excluded services', 'list', False, help='One per line.'),
        f('taxes_note', 'Taxes and fees disclosure', 'text', False),
        f('discounts', 'Discounts', 'text', False, placeholder='e.g. 10% for groups of 6 or more'),
        key='pricing', step=4),
    section('Availability and booking',
        f('booking_type', 'Booking type', 'select', True, options=[
            {'value': 'request', 'label': 'Request to book (you confirm)'},
            {'value': 'instant', 'label': 'Instant booking (always confirmed)'},
            {'value': 'inquiry', 'label': 'Inquiry only (customers ask first)'}]),
        f('operating_days', 'Operating days', 'multiselect', True, options=WEEKDAYS),
        f('start_times', 'Start times', 'list', False, help='One per line, e.g. 08:00'),
        f('season', 'Season', 'text', False, placeholder='e.g. All year, or March–November'),
        f('blocked_dates', 'Blocked dates', 'list', False, help='One date per line (YYYY-MM-DD).'),
        f('notice_hours', 'Book at least … hours ahead', 'number', False),
        f('cancellation_policy', 'Cancellation policy', 'select', True, options=[
            {'value': 'free_24h', 'label': 'Free cancellation up to 24 hours before'},
            {'value': 'free_48h', 'label': 'Free cancellation up to 48 hours before'},
            {'value': 'free_7d', 'label': 'Free cancellation up to 7 days before'},
            {'value': 'non_refundable', 'label': 'Non-refundable'},
            {'value': 'custom', 'label': 'Custom (describe below)'}]),
        f('cancellation_details', 'Cancellation details', 'textarea', False,
          show_if={'field': 'cancellation_policy', 'in': ['custom']}),
        key='availability', step=4),
    section('Location and logistics',
        f('city', 'Main city or area', 'select', True, options=opts(*CITIES)),
        f('location', 'Location label', 'text', True, placeholder='e.g. Marrakech → Merzouga → Fes, or Agafay Desert',
          help='Shown on the listing and used for the map. Use → between places for a route.'),
        f('meeting_point', 'Meeting point', 'text', True),
        f('pickup_offered', 'Hotel pickup offered', 'boolean', False),
        f('pickup_zones', 'Pickup zones', 'list', False, show_if={'field': 'pickup_offered', 'in': ['1']}),
        f('end_point', 'End point', 'text', False),
        key='location', step=5),
    section('Safety, rules and trust',
        f('min_age', 'Minimum age', 'number', False),
        f('accessibility', 'Accessibility', 'multiselect', False,
          options=opts('Wheelchair accessible', 'Suitable for limited mobility', 'Not suitable for reduced mobility',
                       'Stroller friendly', 'Service animals allowed')),
        f('accessibility_notes', 'Accessibility details', 'textarea', False),
        f('safety_info', 'Safety information', 'textarea', False),
        f('restrictions', 'Health and participation restrictions', 'textarea', False),
        f('what_to_bring', 'What to bring', 'list', False),
        f('notes', 'Important notes', 'list', False),
        key='safety', step=5),
    section('Search and publishing',
        f('included_services', 'Included (for search filters)', 'multiselect', False,
          options=opts('Transport', 'Guide', 'Equipment', 'Meals', 'Tickets')),
        f('keywords', 'Search keywords', 'text', False, placeholder='e.g. sahara, camel, sunset'),
        key='publishing', step=5),
]

# ---------------------------------------------------------------- 17 categories

C = []


def cat(key, name, ltype, phase, menu, subtypes, sections, use_for='', feature=''):
    C.append({'slug': key, 'name': name, 'listingType': ltype, 'phase': phase, 'menuGroup': menu,
              'useFor': use_for, 'specialFeature': feature,
              'subtypes': [{'slug': slug(s), 'name': s} for s in subtypes], 'sections': sections})


TRANSPORT = section('Transport',
    f('vehicle_type', 'Vehicle type', 'select', False, options=opts('4x4', 'Minivan', 'Minibus', 'Car', 'Coach')),
    f('vehicle_capacity', 'Passenger capacity', 'number', False),
    f('luggage_capacity', 'Luggage capacity', 'text', False),
    f('air_conditioning', 'Air-conditioned vehicle', 'boolean', False),
    f('transport_mode', 'Transport', 'select', False, options=opts('Private', 'Shared')))

cat('tour-packages', 'Multi-Day Tours', 'multi_day', 1, 'tours', [
    'Marrakech to Merzouga desert tours', 'Fes to Marrakech desert tours', 'Marrakech to Fes tours',
    'Tangier to Marrakech tours', 'Casablanca to Sahara tours', 'Imperial cities tours', 'Grand Morocco tours',
    'Private tailor-made tours', 'Small-group tours', 'Luxury tours', 'Family tours', 'Photography tours',
    'Adventure and trekking tours', 'Northern Morocco tours', 'Atlantic coast tours'], [
    section('Tour overview',
        f('days', 'Number of days', 'number', True), f('nights', 'Number of nights', 'number', True),
        f('start_point', 'Start city', 'text', True), f('end_point', 'End city', 'text', True),
        f('route_type', 'Route type', 'select', True, options=opts('Loop', 'One-way'))),
    section('Itinerary', f('itinerary_days', 'Day-by-day itinerary', 'itinerary', True,
        help='Add, remove and reorder days. Each day: title, description, travel time and overnight location.')),
    TRANSPORT,
    section('Guide',
        f('guide_included', 'Guide included', 'boolean', False),
        f('guide_type', 'Guide type', 'select', False, options=opts('Driver-guide', 'Licensed guide', 'Driver and separate guide')),
        f('local_guides', 'Local guides at specific stops', 'list', False)),
    section('Meals',
        f('meals_included', 'Meals included', 'multiselect', False, options=opts('Breakfast', 'Lunch', 'Dinner')),
        f('dietary_options', 'Dietary arrangements', 'text', False)),
    section('Overnight arrangements',
        f('lodging_type', 'Type of lodging arranged', 'text', False, placeholder='e.g. Riads, kasbah hotel, luxury desert camp'),
        f('room_occupancy', 'Room occupancy', 'text', False),
        f('room_options', 'Room options', 'list', False),
        f('included_nights', 'Included nights', 'number', False),
        help='Only as part of the tour package.'),
    section('Desert options',
        f('desert_options', 'Desert activities', 'multiselect', False,
          options=opts('Camel ride', '4x4', 'Sandboarding', 'Camp dinner', 'Stargazing')),
        f('optional_desert', 'Optional desert activities', 'list', False)),
    section('Pricing extras',
        f('group_size_prices', 'Group size price bands', 'rows', False,
          columns=[f('size', 'Group size'), f('price', 'Price per person', 'number')]),
        f('single_supplement', 'Single supplement', 'number', False),
        f('upgrades', 'Optional upgrades', 'list', False)),
    section('Booking rules',
        f('min_group', 'Minimum group size to depart', 'number', False),
        f('departure_confirmation', 'Departure confirmation', 'text', False),
        f('luggage_limit', 'Luggage limit', 'text', False),
        f('seasonal_variations', 'Seasonal variations', 'textarea', False)),
    section('Travel details',
        f('travel_documents', 'Passport or visa information', 'textarea', False),
        f('physical_difficulty', 'Physical difficulty', 'text', False))],
    'Tours of 2 days or more: private, group, luxury, family and tailor-made.',
    'Day-by-day itinerary builder: add, remove, reorder and edit days.')

cat('day-trips', 'Day Trips', 'scheduled_excursion', 1, 'tours', [
    'Marrakech to Ait Ben Haddou', 'Marrakech to Ouzoud Waterfalls', 'Marrakech to Ourika Valley',
    'Marrakech to Essaouira', 'Marrakech to Agafay Desert', 'Fes to Chefchaouen', 'Fes to Volubilis and Meknes',
    'Casablanca to Rabat', 'Tangier to Chefchaouen', 'Agadir to Paradise Valley', 'Agadir to Taroudant',
    'Ouarzazate to Ait Ben Haddou', 'Merzouga to Rissani', 'Private countryside excursions'], [
    section('Excursion',
        f('start_point', 'Departure city', 'text', True), f('return_city', 'Return city', 'text', False),
        f('pickup_time', 'Pickup time', 'text', False, placeholder='e.g. 08:00'),
        f('return_time', 'Estimated return time', 'text', False),
        f('driving_time', 'Driving time vs. activity time', 'text', False, placeholder='e.g. 5 h driving, 4 h visits')),
    section('Stops', f('stops', 'Stops in order', 'rows', True,
        columns=[f('name', 'Stop'), f('time', 'Time at stop'), f('notes', 'What you do')])),
    TRANSPORT,
    section('Guide and tickets',
        f('guide_included', 'Guide included', 'select', False, options=opts('Included', 'Optional', 'Not included')),
        f('tickets_included', 'Entrance tickets', 'select', False, options=opts('Included', 'Not included')),
        f('meals_included', 'Meals and refreshments', 'text', False)),
    section('Rules',
        f('min_departure', 'Minimum number to depart', 'number', False),
        f('weather_policy', 'Weather alternatives', 'textarea', False))],
    'Full-day or half-day excursions.', 'Pickup-zone selector and an editable excursion timeline.')

cat('city-tours', 'City Tours & Sightseeing', 'scheduled_excursion', 1, 'tours', [
    'Marrakech medina walking tours', 'Fes medina guided tours', 'Casablanca city tours', 'Rabat historical tours',
    'Tangier city tours', 'Chefchaouen walking tours', 'Essaouira medina tours', 'Meknes heritage tours',
    'Ouarzazate kasbah tours', 'Jewish heritage tours', 'Historical monument tours', 'Architecture tours',
    'Photography walks', 'Street art and contemporary culture tours', 'Nighttime city tours', 'Private guided sightseeing'], [
    section('Tour format',
        f('neighborhood', 'Neighbourhood', 'text', False),
        f('tour_format', 'Format', 'select', True, options=opts('Walking', 'Driving', 'Cycling', 'Mixed')),
        f('themes', 'Themes', 'multiselect', False, options=opts('History', 'Architecture', 'Shopping', 'Food', 'Photography', 'Heritage')),
        f('walking_distance', 'Walking distance', 'text', False)),
    section('Route', f('stops', 'Points of interest in order', 'rows', True,
        columns=[f('name', 'Place'), f('time', 'Time'), f('notes', 'Notes')]),
        f('end_point', 'End point', 'text', False)),
    section('Guide and tickets',
        f('guide_license', 'Licensed guide details', 'text', False),
        f('tickets_included', 'Entrance fees and monument tickets', 'select', False, options=opts('Included', 'Not included')),
        f('private_supplement', 'Private guide supplement', 'number', False),
        f('evening_available', 'Evening tours available', 'boolean', False))],
    'Walking tours, medina, heritage, architecture and photography tours.', 'Route builder with stops in order.')

cat('desert-adventures', 'Desert Adventures', 'timed_activity', 1, 'adventure', [
    'Quad biking in Merzouga', 'Quad biking in Agafay', 'Dune buggy experiences', 'Camel rides at sunset',
    'Sunrise camel rides', 'Multi-hour camel trekking', 'Overnight camel trekking', 'Sandboarding',
    '4x4 desert excursions', 'Off-road desert adventures', 'Nomad family visits', 'Gnawa music experiences in Khamlia',
    'Fossil discovery excursions', 'Desert photography tours', 'Stargazing experiences', 'Sunrise and sunset excursions',
    'Desert picnic experiences', 'Private desert adventures'], [
    section('Activity',
        f('desert_area', 'Desert area', 'select', True, options=opts('Merzouga (Erg Chebbi)', 'Agafay', 'Zagora', 'Erg Chegaga', 'Other')),
        f('route_length', 'Route length', 'text', False),
        f('sun_sessions', 'Sunrise / sunset sessions', 'multiselect', False, options=opts('Sunrise', 'Sunset'))),
    section('Vehicles and equipment',
        f('equipment_type', 'Vehicle or equipment type', 'text', True, placeholder='e.g. 250cc quad, 2-seat buggy, camel'),
        f('equipment_count', 'Units available', 'number', True, help='You cannot accept more riders than vehicles and staff allow.'),
        f('seat_options', 'Options', 'rows', False, columns=[f('name', 'Option (e.g. single quad)'), f('price', 'Price', 'number')]),
        f('protective_gear', 'Helmet and protective equipment', 'text', False),
        f('guide_ratio', 'Guide-to-participant ratio', 'text', False, placeholder='e.g. 1 guide per 6 riders')),
    section('Requirements',
        f('driver_min_age', 'Driver minimum age', 'number', False),
        f('passenger_min_age', 'Passenger minimum age', 'number', False),
        f('license_required', 'Driving licence required', 'boolean', False),
        f('skill_level', 'Skill and fitness level', 'text', False),
        f('weight_limit', 'Weight limit (only where justified)', 'text', False),
        f('safety_briefing', 'Safety briefing and operating rules', 'textarea', True),
        f('weather_policy', 'Weather and sand-condition policy', 'textarea', False))],
    'Quad biking, buggies, camel rides, sandboarding, 4x4.', 'Equipment and capacity management.')

cat('desert-camps', 'Desert Camps & Experiences', 'experience_package', 1, 'desert', [
    'Agafay sunset experiences', 'Agafay dinner and live show', 'Merzouga campfire evenings', 'Sahara stargazing sessions',
    'Traditional Berber/Amazigh music nights', 'Camp dinner experiences', 'Private desert dinners',
    'Sunrise photography sessions', 'Camel trekking with a camp experience', '4x4 excursions combined with camp activities',
    'Sandboarding sessions', 'Traditional tea ceremonies', 'Desert picnic experiences', 'Astronomy and night-sky experiences'], [
    section('Experience',
        f('venue_name', 'Camp or venue name', 'text', True),
        f('experience_parts', 'What it includes', 'multiselect', True,
          options=opts('Dinner', 'Live music', 'Stargazing', 'Sunset', 'Sunrise', 'Camel ride', 'Tea ceremony', 'Campfire')),
        f('start_end_time', 'Start and end time', 'text', True, placeholder='e.g. 17:00–22:00'),
        f('performance', 'Live performance details', 'text', False),
        f('menu', 'Menu or refreshments', 'list', False),
        f('dietary_options', 'Dietary accommodations', 'text', False),
        f('private_setup', 'Private setup available', 'boolean', False)),
    section('Packages', f('packages', 'Package options', 'rows', False,
        columns=[f('name', 'Package (e.g. Sunset + dinner)'), f('price', 'Price', 'number'), f('description', 'What it includes')]),
        help='Bundle builder: e.g. Agafay sunset + dinner + live music.'),
    section('Logistics',
        f('transfer_options', 'Transfer and pickup options', 'text', False),
        f('weather_policy', 'Weather backup plan', 'textarea', False),
        f('fire_safety', 'Fire and outdoor safety', 'textarea', False),
        f('special_occasions', 'Photography and special-occasion options', 'text', False))],
    'Bookable camp experiences, not accommodation.', 'Bundle builder for experience packages.')

cat('outdoor-adventures', 'Outdoor Adventures & Nature', 'timed_activity', 2, 'adventure', [
    'Atlas Mountains hiking', 'Toubkal trekking', 'Guided mountain walks', 'Amazigh village walks', 'Waterfall hikes',
    'Canyoning', 'Rock climbing', 'Mountain biking', 'E-bike tours', 'Cycling excursions', 'Horse riding',
    'Mule-supported treks', 'Birdwatching', 'Wildlife and nature tours', 'Oasis excursions', 'Fossil and geology tours',
    'Hot-air balloon rides', 'Paragliding', 'Ziplining', 'Nature photography excursions'], [
    section('Route',
        f('route_length', 'Route length', 'text', False), f('elevation_gain', 'Elevation gain', 'text', False),
        f('highest_point', 'Highest point', 'text', False), f('pace', 'Estimated pace', 'text', False)),
    section('Guides and equipment',
        f('guide_qualifications', 'Guide qualifications and certifications', 'text', False),
        f('guide_ratio', 'Guide ratio', 'text', False),
        f('equipment_supplied', 'Equipment supplied', 'list', False),
        f('equipment_needed', 'Equipment you bring (footwear, clothing)', 'list', False),
        f('technical_requirements', 'Technical requirements (climbing, flying)', 'textarea', False)),
    section('Conditions',
        f('trailhead_transport', 'Transport to trailhead or site', 'text', False),
        f('weather_policy', 'Weather thresholds and cancellation', 'textarea', False),
        f('emergency_procedures', 'Emergency and evacuation procedures', 'textarea', False),
        f('environment_rules', 'Wildlife and environmental rules', 'textarea', False))],
    'Trekking, hiking, climbing, cycling, birdwatching, balloons, paragliding.', 'Different field sets per subtype.')

cat('water-sports', 'Water Sports & Beach Activities', 'timed_activity', 2, 'adventure', [
    'Surf lessons in Taghazout', 'Surf camps and guided surf sessions', 'Kitesurfing in Dakhla', 'Windsurfing',
    'Paddleboarding', 'Kayaking', 'Jet skiing', 'Boat trips', 'Sailing experiences', 'Fishing trips',
    'Scuba diving', 'Snorkeling', 'Beach horseback riding', 'Beach quad biking', 'Coastal hiking', 'Sunset boat excursions'], [
    section('Session',
        f('launch_point', 'Beach or launch point', 'text', True),
        f('level', 'Level', 'select', True, options=opts('Beginner', 'Intermediate', 'Advanced', 'All levels')),
        f('format', 'Format', 'select', True, options=opts('Lesson', 'Rental', 'Guided excursion'))),
    section('Instructors and equipment',
        f('instructor_qualifications', 'Instructor qualifications', 'text', False),
        f('instructor_ratio', 'Participants per instructor', 'number', False),
        f('equipment_sizes', 'Equipment sizes available', 'text', False),
        f('safety_equipment', 'Life jackets and safety equipment', 'text', False),
        f('facilities', 'Changing facilities or storage', 'text', False)),
    section('Conditions',
        f('swimming_required', 'Must be able to swim', 'boolean', False),
        f('weather_policy', 'Weather, wind, tide and sea policy', 'textarea', True),
        f('seasonal_availability', 'Seasonal availability and rescheduling', 'textarea', False))],
    'Surf, kite, kayak, paddle, boats, diving, fishing.', 'Equipment inventory and weather-dependent slots.')

cat('food-culinary', 'Food & Culinary Experiences', 'class_workshop', 2, 'food', [
    'Moroccan cooking classes', 'Tagine cooking workshops', 'Couscous preparation classes',
    'Bread-making with a local family', 'Traditional mint tea ceremonies', 'Moroccan pastry workshops',
    'Medina food tours', 'Street-food tasting walks', 'Spice market tours', 'Market visits with a local cook',
    'Farm-to-table cooking experiences', 'Olive oil and local product tastings', 'Dates and regional food tastings',
    'Traditional food experiences with local families', 'Regional specialty culinary tours'], [
    section('Experience',
        f('venue', 'Venue', 'text', True),
        f('format', 'Format', 'multiselect', True, options=opts('Cooking', 'Tasting', 'Market visit', 'Food walk')),
        f('market_visit', 'Market visit included', 'boolean', False)),
    section('Menu', f('menu', 'Dishes prepared or tasted', 'list', True),
        f('ingredients_supplied', 'Ingredients supplied', 'boolean', False),
        f('take_home', 'Recipes or food to take home', 'text', False)),
    section('Dietary information',
        f('dietary_options', 'Dietary options', 'multiselect', False, options=opts('Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Lactose-free')),
        f('allergens', 'Allergens and cross-contamination', 'textarea', True),
        f('kitchen_facilities', 'Kitchen accessibility and facilities', 'text', False))],
    'Cooking classes, food tours, tastings.', 'Menu builder with dietary and allergen information.')

cat('cultural-experiences', 'Cultural & Amazigh Experiences', 'class_workshop', 2, 'culture', [
    'Amazigh village experiences', 'Traditional music performances', 'Gnawa music sessions', 'Moroccan dance workshops',
    'Traditional storytelling', 'Henna art workshops', 'Pottery-making classes', 'Zellige tile workshops',
    'Carpet weaving demonstrations', 'Leathercraft workshops', 'Traditional woodworking', 'Calligraphy classes',
    'Caftan and traditional clothing workshops', 'Local artisan visits', 'Traditional bread-making', 'Tea-making ceremonies',
    'Cultural heritage walks', 'Rural community experiences', 'Festivals and moussem experiences'], [
    section('Host and tradition',
        f('host_profile', 'Host, artisan or performer', 'textarea', True),
        f('cultural_context', 'About the tradition', 'textarea', True, help='Explain the tradition. Avoid generic or unsupported claims.')),
    section('Session',
        f('participation', 'Format', 'select', True, options=opts('Demonstration', 'Hands-on', 'Performance')),
        f('materials_included', 'Materials and tools included', 'list', False),
        f('take_home', 'Item to take home', 'text', False),
        f('etiquette', 'Etiquette and photography permissions', 'textarea', False),
        f('community_benefit', 'Community benefit (verifiable)', 'text', False))],
    'Village visits, music, crafts, storytelling, henna.', 'Host profile and an explanation of the tradition.')

cat('wellness', 'Wellness & Relaxation', 'timed_activity', 2, 'food', [
    'Traditional hammam experiences', 'Moroccan black-soap treatments', 'Ghassoul clay treatments',
    'Argan oil massage experiences', 'Spa and massage sessions', 'Yoga classes', 'Meditation sessions', 'Yoga retreats',
    'Wellness day experiences', 'Traditional beauty rituals', 'Countryside relaxation experiences'], [
    section('Treatment',
        f('session_format', 'Session', 'select', True, options=opts('Individual', 'Couple', 'Group')),
        f('treatment_steps', 'Treatment steps and products', 'list', False),
        f('practitioner', 'Practitioner qualifications', 'text', False),
        f('privacy', 'Privacy and gender-specific arrangements', 'text', False),
        f('preparation', 'Clothing and preparation', 'textarea', False),
        f('items_included', 'Included items (towels, products)', 'list', False),
        f('contraindications', 'Contraindications and precautions', 'textarea', True),
        f('late_policy', 'Late-arrival policy', 'text', False))],
    'Hammams, spa, massage, yoga, meditation.', 'Appointment slots by session length.')

cat('unique-experiences', 'Unique & Special Experiences', 'experience_package', 3, 'desert', [
    'Hot-air balloon flights', 'Horse-drawn carriage rides', 'Private sunset picnics',
    'Romantic proposals and special occasions', 'Private photography sessions', 'Stargazing with an astronomy guide',
    'Luxury 4x4 excursions', 'Private cultural evenings', 'Sunrise experiences', 'Custom-designed experiences'], [
    section('Experience',
        f('occasion', 'Occasion', 'multiselect', False, options=opts('Birthday', 'Anniversary', 'Proposal', 'Honeymoon', 'General')),
        f('venue', 'Venue and exact meeting point', 'text', True),
        f('customization', 'Customisation options', 'list', False),
        f('add_ons', 'Decorations, flowers, photography add-ons', 'list', False),
        f('setup_time', 'Setup and preparation time', 'text', False),
        f('weather_policy', 'Weather contingency', 'textarea', False),
        f('confirmation_deadline', 'Special requests deadline', 'text', False)),
    section('Package tiers', f('packages', 'Packages', 'rows', False,
        columns=[f('name', 'Tier (e.g. Basic, Premium, Private)'), f('price', 'Price', 'number'), f('description', 'Includes')]))],
    'Balloons, picnics, proposals, photography, premium experiences.', 'Package tiers: basic, premium, private.')

cat('arts-crafts', 'Arts, Crafts & Workshops', 'class_workshop', 2, 'events', [
    'Painting classes', 'Drawing and sketching walks', 'Photography workshops', 'Jewelry-making classes',
    'Leathercraft sessions', 'Weaving workshops', 'Perfume-making workshops', 'Natural cosmetics workshops',
    'Traditional instrument lessons', 'Handmade souvenir workshops'], [
    section('Workshop',
        f('host_profile', 'Instructor or artisan', 'textarea', True),
        f('level', 'Skill level', 'select', True, options=opts('Beginner', 'Intermediate', 'Advanced')),
        f('materials_included', 'Materials and tools supplied', 'list', True),
        f('finished_item', 'Finished item', 'select', False, options=opts('Included', 'Extra charge', 'Not applicable')),
        f('shipping', 'Shipping or collection of finished work', 'text', False),
        f('tool_safety', 'Tool and material safety', 'textarea', False),
        f('venue', 'Indoor or outdoor venue', 'text', False))],
    'Pottery, zellige, weaving, jewellery, painting, leather, perfume.', 'Session capacity and materials.')

cat('family-activities', 'Family & Kids\' Activities', 'timed_activity', 3, 'events', [
    'Family-friendly camel rides', 'Family cooking classes', 'Pottery workshops for children',
    'Family-friendly guided city tours', 'Easy nature walks', 'Horse riding for beginners', 'Educational farm visits',
    'Interactive cultural workshops', 'Family desert excursions', 'Children\'s craft activities'], [
    section('Family details',
        f('child_age_range', 'Children\'s ages', 'text', True, placeholder='e.g. 4–12'),
        f('supervision', 'Adult supervision required', 'text', True),
        f('family_price', 'Family package price', 'number', False),
        f('child_gear', 'Child equipment and safety gear', 'text', False),
        f('stroller_access', 'Stroller access', 'boolean', False),
        f('rest_breaks', 'Rest breaks', 'text', False),
        f('max_children', 'Maximum children per session', 'number', False),
        f('weather_policy', 'Weather alternatives', 'textarea', False))],
    'Family camel rides, child-friendly workshops, easy hikes.', 'Age-based booking with adults and children.')

cat('sports-active', 'Sports & Active Experiences', 'class_workshop', 3, 'adventure', [
    'Golf experiences', 'Tennis lessons', 'Running tours', 'Mountain biking', 'Road cycling', 'Fitness sessions',
    'Martial arts classes', 'Horse riding lessons', 'Climbing lessons', 'Guided outdoor training'], [
    section('Session',
        f('format', 'Format', 'select', True, options=opts('Lesson', 'Rental', 'Guided session', 'Independent')),
        f('level', 'Skill level', 'select', False, options=opts('Beginner', 'Intermediate', 'Advanced', 'All levels')),
        f('instructor_qualifications', 'Instructor qualifications', 'text', False),
        f('equipment_sizes', 'Equipment sizes available', 'text', False),
        f('venue', 'Venue, course or route', 'text', True),
        f('facility_fees', 'Court/course fees', 'text', False),
        f('injury_prevention', 'Safety and injury prevention', 'textarea', False))],
    'Cycling, golf, tennis, fitness and lessons.', 'Equipment allocation and instructor scheduling.')

cat('local-guides', 'Local Guides & Themed Tours', 'scheduled_excursion', 2, 'culture', [
    'Licensed city guides', 'Private local guides', 'Food-focused guides', 'History and heritage guides',
    'Photography guides', 'Nature guides', 'Architecture guides', 'Shopping and souk guides', 'Jewish heritage guides',
    'Custom private walking tours'], [
    section('Guide service',
        f('guide_bio', 'Guide biography', 'textarea', True),
        f('specialties', 'Specialties', 'list', False),
        f('guide_license', 'Qualifications and licence', 'text', True),
        f('service_areas', 'Service areas', 'list', False),
        f('rate_type', 'Pricing', 'select', True, options=opts('Hourly', 'Half day', 'Full day')),
        f('transport_provided', 'Transport provided', 'boolean', False),
        f('service_scope', 'Service', 'select', False, options=opts('Guide only', 'Complete tour')))],
    'Licensed city guides and private guides.', 'Reusable guide profile linked to tours.')

cat('events-entertainment', 'Events & Entertainment', 'event_ticket', 3, 'events', [
    'Traditional music performances', 'Live cultural shows', 'Folklore performances', 'Seasonal festivals',
    'Local cultural events', 'Traditional fantasia shows', 'Dance performances', 'Special event experiences',
    'Guided festival visits', 'Creative and cultural events'], [
    section('Event',
        f('venue', 'Venue', 'text', True),
        f('event_dates', 'Event dates', 'list', True, help='One per line: YYYY-MM-DD HH:MM'),
        f('organizer', 'Performer or organiser', 'text', False),
        f('program', 'Programme', 'list', False),
        f('tickets', 'Ticket types', 'rows', True, columns=[f('name', 'Ticket'), f('price', 'Price', 'number'), f('quantity', 'Available', 'number')]),
        f('seating', 'Seating', 'select', False, options=opts('Seated', 'Standing', 'Mixed')),
        f('entry_rules', 'Entry instructions and rules', 'textarea', False),
        f('ticket_delivery', 'Ticket delivery', 'select', False, options=opts('Email', 'QR code', 'Name on list')))],
    'Music, folklore, festivals and shows.', 'Ticket inventory and event dates.')

cat('private-transfers', 'Private Transport & Transfers', 'transfer', 3, 'tours', [
    'Airport transfers', 'Private drivers', 'Private intercity transfers', 'Chauffeur services',
    'Private sightseeing by car', '4x4 transport for remote excursions', 'Point-to-point transfers linked to activities'], [
    section('Service',
        f('transfer_type', 'Transfer type', 'select', True, options=opts('Airport', 'City', 'Intercity', 'Activity transfer')),
        f('routes', 'Routes and prices', 'rows', True, columns=[f('from', 'From'), f('to', 'To'), f('price', 'Price', 'number')]),
        f('vehicle_type', 'Vehicle type and comfort', 'text', True),
        f('vehicle_capacity', 'Passenger capacity', 'number', True),
        f('luggage_capacity', 'Luggage capacity', 'text', False),
        f('child_seats', 'Child seats available', 'boolean', False),
        f('wheelchair_vehicle', 'Wheelchair-accessible vehicle', 'boolean', False),
        f('meet_greet', 'Meet-and-greet', 'text', False),
        f('waiting_time', 'Free waiting time and extra charges', 'text', False),
        f('surcharges', 'Night or holiday surcharges', 'text', False),
        f('operator_permits', 'Operator permits and insurance', 'text', False))],
    'Airport transfers, private drivers, intercity.', 'Route-based pricing and pickup scheduling.')

MENU_GROUPS = [
    {'key': 'tours', 'label': 'Tours'}, {'key': 'adventure', 'label': 'Adventure'},
    {'key': 'desert', 'label': 'Desert Experiences'}, {'key': 'culture', 'label': 'Culture & Local Life'},
    {'key': 'food', 'label': 'Food & Wellness'}, {'key': 'events', 'label': 'Events & Workshops'},
]

ONBOARDING = [
    {'key': 'business_name', 'label': 'Business or supplier name'},
    {'key': 'legal', 'label': 'Legal business details and registration documents'},
    {'key': 'contact', 'label': 'Contact person, email and phone'},
    {'key': 'address', 'label': 'Business address and operating locations'},
    {'key': 'business_type', 'label': 'Business type'},
    {'key': 'permits', 'label': 'Permits, licences and insurance'},
    {'key': 'languages', 'label': 'Languages and service coverage'},
    {'key': 'payout', 'label': 'Payout details (when online payment is enabled)'},
    {'key': 'terms', 'label': 'Agreement to marketplace terms and supplier policies'},
]

FILTERS = ['duration_type', 'city', 'price', 'tour_style', 'languages', 'traveler_types', 'activity_level',
           'booking_type', 'time_of_day', 'accessibility', 'free_cancel', 'rating', 'experience_style',
           'included_services', 'date']

schema = {'version': 1, 'listingTypes': LISTING_TYPES, 'common': COMMON, 'categories': C,
          'menuGroups': MENU_GROUPS, 'onboarding': ONBOARDING, 'filters': FILTERS,
          'wizardSteps': ['Category and type', 'Describe the experience', 'Specialized details',
                          'Prices and availability', 'Location, inclusions and policies', 'Photos and preview', 'Submit for review']}

out = os.path.join(os.path.dirname(__file__), '..', 'wp-content', 'plugins', 'travel-agency-core', 'data', 'listing-schema.json')
with open(out, 'w', encoding='utf-8') as fh:
    json.dump(schema, fh, ensure_ascii=False, indent=1)
    fh.write('\n')
print('categories', len(C), 'subtypes', sum(len(c['subtypes']) for c in C),
      'fields', sum(len(s['fields']) for c in C for s in c['sections']) + sum(len(s['fields']) for s in COMMON))
