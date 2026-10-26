# Menu setup for the live site (MoroccoTravely marketplace)

The header shows the menu assigned to the **Main menu** location in *Appearance → Menus*.
The footer's "About" column shows the **Footer links** menu. On phones, the menu button also lists the **Orange tab links** menu.

## 0. Quick check first (1 minute)

1. wp-admin → **Appearance → Menus** → open the **Select a menu to edit** list.
2. If a menu called **Marketplace menu** exists, it is already built: go to the **Manage Locations** tab, set **Main menu (dropdowns…)** to **Marketplace menu**, click **Save Changes**. Done.
3. If it doesn't exist: wp-admin → **Plugins** → check that *Travel Agency Core* is version **1.2.0** or newer (upload the new zip if not), then open any wp-admin page once. The plugin creates the menu and the categories. Then repeat step 2.
4. Only if that still doesn't work, build it by hand with the structure below.

## 1. Listing categories that must exist

wp-admin → **Listings → Listing categories**. Each top-level category (slug in brackets) holds its activity types as child categories. The plugin creates all of them; check that these 17 exist:

| Menu group | Category (slug) | Launch phase |
| --- | --- | --- |
| Tours | Multi-Day Tours (`tour-packages`) | 1 |
| Tours | Day Trips (`day-trips`) | 1 |
| Tours | City Tours & Sightseeing (`city-tours`) | 1 |
| Tours | Private Transport & Transfers (`private-transfers`) | 3 |
| Adventure | Desert Adventures (`desert-adventures`) | 1 |
| Adventure | Outdoor Adventures & Nature (`outdoor-adventures`) | 2 |
| Adventure | Water Sports & Beach Activities (`water-sports`) | 2 |
| Adventure | Sports & Active Experiences (`sports-active`) | 3 |
| Desert Experiences | Desert Camps & Experiences (`desert-camps`) | 1 |
| Desert Experiences | Unique & Special Experiences (`unique-experiences`) | 3 |
| Culture & Local Life | Cultural & Amazigh Experiences (`cultural-experiences`) | 2 |
| Culture & Local Life | Local Guides & Themed Tours (`local-guides`) | 2 |
| Food & Wellness | Food & Culinary Experiences (`food-culinary`) | 2 |
| Food & Wellness | Wellness & Relaxation (`wellness`) | 2 |
| Events & Workshops | Arts, Crafts & Workshops (`arts-crafts`) | 2 |
| Events & Workshops | Family & Kids' Activities (`family-activities`) | 3 |
| Events & Workshops | Events & Entertainment (`events-entertainment`) | 3 |

The "Morocco Tours From …" categories (`tours-from-marrakech`, `-fes`, `-casablanca`, `-tangier`, `-errachidia`, `-ouarzazate`) stay as they are: the home page uses them for "Top destinations".

## 2. Main menu (header): 6 groups, each a dropdown

Create a menu named **Marketplace menu** and assign it to **Main menu (dropdowns…)**. For each group, add a **Custom Link** with URL `#` and the group name as link text. Then add the categories under it from the **Listing categories** box and drag each one slightly to the right so it becomes a sub-item.

```
Tours                              (Custom Link, URL #)
  ├─ Multi-Day Tours                (Listing category)
  ├─ Day Trips
  ├─ City Tours & Sightseeing
  └─ Private Transport & Transfers
Adventure                          (Custom Link, URL #)
  ├─ Desert Adventures
  ├─ Outdoor Adventures & Nature
  ├─ Water Sports & Beach Activities
  └─ Sports & Active Experiences
Desert Experiences                 (Custom Link, URL #)
  ├─ Desert Camps & Experiences
  └─ Unique & Special Experiences
Culture & Local Life               (Custom Link, URL #)
  ├─ Cultural & Amazigh Experiences
  └─ Local Guides & Themed Tours
Food & Wellness                    (Custom Link, URL #)
  ├─ Food & Culinary Experiences
  └─ Wellness & Relaxation
Events & Workshops                 (Custom Link, URL #)
  ├─ Arts, Crafts & Workshops
  ├─ Family & Kids' Activities
  └─ Events & Entertainment
```

If a Listing category can't be found in the box, add it as a **Custom Link** with URL `/search?category=<slug>` (for example `/search?category=desert-adventures`). The site shows the same page.

Keep it to these 6 top-level items. More will not fit on one line on laptop screens.

## 3. Footer links menu (footer "About" column)

Menu name **Footer links**, location **Footer links (About column)**:

| Link text | Type | Target |
| --- | --- | --- |
| About Us | Page | About Us (`about-us`) |
| Contact Us | Custom Link | `/contact` |
| FAQs | Page | FAQs (`faqs`) |
| Booking & Cancellation Policy | Page | `booking-cancellation-policy` |
| Privacy Policy | Page | `privacy-policy` |
| Terms & Conditions | Page | `terms-and-conditions` |

## 4. Orange tab links menu (phone menu only)

Menu name **Orange tab links**, location **Quick links (phone menu)** (the desktop header no longer shows it):

Home (Custom Link `/`) · About Us (page) · Contact Us (Custom Link `/contact`) · FAQs (page)

## 5. Pages that must exist and be published

wp-admin → **Pages**: About Us (`about-us`), FAQs (`faqs`), Booking & Cancellation Policy (`booking-cancellation-policy`), Privacy Policy (`privacy-policy`), Terms & Conditions (`terms-and-conditions`). The slug is the part of the address after the domain. *Contact Us* (`/contact`) is built into the site; don't create a page for it.

The demo import creates these pages. Agency details → **Demo content** → Import demo content adds any that are missing without overwriting your text.

---

## Prompt for another Claude chat

Use a Claude chat that can control your browser (for example Claude in Chrome). Sign in to wp-admin first, then paste:

```text
You are helping me set up the menus of my WordPress site https://marruecosrutas4x4.com
(a Morocco tours & activities marketplace using the "Travel Agency Core" plugin and the
"MoroccoTravely" theme). I am signed in to wp-admin in this browser. Work only in
wp-admin, go step by step, and tell me what you did after each step. Do NOT delete
menus, pages, categories or listings, and do not change any other settings. Ask me
before anything you are unsure about.

1. Open Plugins and tell me the version of "Travel Agency Core". If it is below 1.2.0,
   stop and tell me (I need to upload the new zip first).

2. Open Listings → Listing categories. Check that these 17 top-level categories exist
   (name — slug): Multi-Day Tours — tour-packages; Day Trips — day-trips; City Tours &
   Sightseeing — city-tours; Private Transport & Transfers — private-transfers; Desert
   Adventures — desert-adventures; Outdoor Adventures & Nature — outdoor-adventures;
   Water Sports & Beach Activities — water-sports; Sports & Active Experiences —
   sports-active; Desert Camps & Experiences — desert-camps; Unique & Special
   Experiences — unique-experiences; Cultural & Amazigh Experiences —
   cultural-experiences; Local Guides & Themed Tours — local-guides; Food & Culinary
   Experiences — food-culinary; Wellness & Relaxation — wellness; Arts, Crafts &
   Workshops — arts-crafts; Family & Kids' Activities — family-activities; Events &
   Entertainment — events-entertainment. List any that are missing and ask me before
   creating them.

3. Open Appearance → Menus. If a menu named "Marketplace menu" exists, open the
   "Manage Locations" tab, set "Main menu (dropdowns…)" to "Marketplace menu", save, and go to step 5.

4. Otherwise create a new menu named "Marketplace menu" with exactly these 6 top-level
   items, each a Custom Link with URL "#", and these Listing categories as sub-items
   (drag each one to the right under its group):
   - Tours: Multi-Day Tours, Day Trips, City Tours & Sightseeing, Private Transport & Transfers
   - Adventure: Desert Adventures, Outdoor Adventures & Nature, Water Sports & Beach
     Activities, Sports & Active Experiences
   - Desert Experiences: Desert Camps & Experiences, Unique & Special Experiences
   - Culture & Local Life: Cultural & Amazigh Experiences, Local Guides & Themed Tours
   - Food & Wellness: Food & Culinary Experiences, Wellness & Relaxation
   - Events & Workshops: Arts, Crafts & Workshops, Family & Kids' Activities, Events &
     Entertainment
   If a category is not in the "Listing categories" box, add it as a Custom Link with
   URL /search?category=<slug> instead. Under "Menu Settings" tick "Main menu (dropdowns…)" and save.
   Leave the old main menu in place (just not assigned).

5. Check the menu "Footer links" (location "Footer links (About column)" — older theme versions call it "Footer: useful links") contains, in this order:
   About Us (page), Contact Us (Custom Link /contact), FAQs (page), Booking &
   Cancellation Policy (page), Privacy Policy (page), Terms & Conditions (page). Add
   what is missing; don't remove other items without asking me.

6. Check the menu "Orange tab links" (location "Quick links (phone menu)" — older theme versions call it "Orange tab under the menu") contains: Home (Custom Link
   /), About Us (page), Contact Us (Custom Link /contact), FAQs (page).

7. Open Pages and confirm these are published with these slugs: about-us, faqs,
   booking-cancellation-policy, privacy-policy, terms-and-conditions. Report any that
   are missing or drafts; don't create or publish anything without asking me.

8. Open the home page of the site in a new tab and check the header shows the 6 groups
   (Tours, Adventure, Desert Experiences, Culture & Local Life, Food & Wellness, Events &
   Workshops) and that each dropdown lists its categories. Tell me what you see.
```
