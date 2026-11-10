# Idea Lab image generation

The 100 independent images in `public/assets/scenes/idea-lab/` were generated with the built-in image tool, as ten atlases. The final site files are individual 500 × 300 WebP crops. Each atlas has two columns and five rows, read from left to right and top to bottom. The repository keeps only the final crops and their bilingual metadata in `production/idea-lab-scenes.tsv`.

Shared prompt:

> Create one educational image atlas for a vocabulary and speaking lab, topic [topic]. Portrait 1024x1536, strictly 2 columns and 5 rows, ten equal rectangular landscape cells, aligned with the exact 50% vertical boundary and 20%,40%,60%,80% horizontal boundaries. No margins, gaps, captions, letters, graphic borders, or numbers. Each cell is a separate frame, no subject crosses cell boundaries. Photorealistic candid documentary photography in contemporary Arab communities, naturally modest dress for men and women, women with headscarves and long sleeves, warm believable daylight, coherent scenes. Show at least 4 identifiable context objects and a clear central action in every cell, medium-wide shots; center the essential detail.

## home

1. Family laying breakfast table with bread and tea
2. father packing child's school bag near front door
3. grandmother sorting a drawer of keys and papers
4. family folding laundry in sunlit living room
5. two siblings putting groceries into refrigerator
6. man fixing loose chair leg beside toolbox
7. mother and daughter making a shopping list at kitchen counter
8. father sweeping balcony with potted herbs
9. family welcoming guest with dates and tea
10. young man setting alarm beside books and lamp at bedtime

## food

1. Street baker arranging flatbread in trays
2. shoppers comparing oranges and pears at market
3. cook ladling lentil soup into bowls
4. barista taking tea order at café
5. family preparing salad with cucumber tomato lemon
6. young men comparing jars of honey at food stall
7. baker measuring flour and kneading dough
8. shopper choosing dates by weight with seller
9. family packing picnic sandwiches and fruit
10. restaurant staff boxing leftovers in separate containers

## travel

1. Passenger checking rail platform with station worker
2. father and son comparing suitcases at check-in
3. two friends consulting map at city bus stop
4. hotel guest handing room key to receptionist
5. taxi pickup at busy arrivals hall
6. travelers sheltering with luggage under canopy in rain
7. ferry crew helping passengers aboard at harbor
8. travelers using pedestrian bridge near station
9. bus driver explaining route on paper map
10. man collecting backpack at lost property desk

## study

1. Students comparing notes at a library table
2. librarian helping a child find a book
3. teacher demonstrating fraction with paper strips
4. pupils rehearsing a group presentation
5. student practicing pronunciation with headphones
6. young woman writing a short story beside sketchbook
7. classmates measuring a paper model with ruler
8. instructor pointing to a globe and compass
9. student sorting flashcards into piles
10. students looking at local history photos in study room

## work

1. Receptionist issuing visitor badge
2. coworkers arranging shift schedule using blank colored cards
3. job interview with applicant and panel
4. staff measuring packages at shipping desk
5. technician repairing a desktop printer
6. architect presenting floor plan at worktable
7. coworkers testing video meeting on laptop
8. stockroom staff counting boxes and shelves
9. colleague showing new worker where equipment is
10. team clearing a walkway before moving furniture

## neighborhood

1. Neighbors exchanging borrowed tools at gate
2. two men organizing books at swap table
3. families volunteering at community garden
4. resident asking for directions to a pharmacy
5. family bringing food to a new neighbor
6. man securing bicycle at shared bike locker
7. neighbors setting chairs for community meeting
8. siblings looking for playground entrance
9. tailor measuring jacket sleeve
10. two people returning a parcel at corner shop

## nature

1. Hikers checking map near rocky trail
2. family observing rainbow after rain from porch
3. children with father identifying leaves in park
4. two men photographing birds from a hide
5. gardeners planting herbs in raised beds
6. hikers sorting supplies before desert walk
7. father and son checking wind at seaside promenade fully clothed
8. farmers picking ripe figs
9. volunteers sorting litter at stream bank
10. two friends securing tent at campsite

## health

1. Patient checking in at clinic reception
2. pharmacist explaining dosage label to customer, no readable text
3. man doing seated stretch with trainer
4. father comforting child in waiting room
5. first aid volunteer checking supplies
6. friends taking a water break after walking
7. optician adjusting glasses for customer
8. family preparing water and healthy snack
9. visitor finding hand sanitizer and directions at clinic
10. nurse showing appointment card to older visitor

## craft

1. Potter forming a clay bowl beside finished bowls
2. tailor replacing zipper on bag
3. two friends testing camera focus by window
4. carpenter comparing lengths of wood
5. volunteers fixing bicycle brakes
6. young woman arranging photographs in album
7. man showing how to use labeling machine
8. child and parent constructing paper bridge
9. shoemaker stitching shoe at bench
10. craft seller wrapping handmade notebook

## events

1. Group arranging chairs and sound equipment in hall
2. family planning indoor alternative for rainy picnic
3. volunteers welcoming visitors at book fair
4. male team rehearsing a short theatre scene
5. families choosing seats for storytelling
6. man photographing outdoor market event behind rope
7. volunteers packing welcome bags
8. hosts arranging dates and tea before guests arrive
9. two men checking clock and seating chart outside lecture
10. relatives preparing simple cake and birthday card

# Adding conversation scenes

The image registry is `production/conversation-scenes.json`. Use a dialogue ID from `public/dialogues.json`. A cover is shared for the dialogue; a numbered turn takes priority while that turn is spoken. Number turns starting at 1. If a cover is missing, the existing example image is explicitly labeled as illustrative.

An entry may reference an Idea Lab scene by ID, or point to a dedicated WebP under `public/assets/scenes/conversations/`. For example:

```json
{
  "find-the-platform": {
    "cover": "idea-travel-01",
    "turns": {
      "3": {
        "id": "conv-find-the-platform-ticket-check",
        "path": "assets/scenes/conversations/find-the-platform-ticket-check.webp",
        "width": 900,
        "height": 540,
        "en": "A ticket inspector checking a passenger's ticket near the platform.",
        "ar": "مفتش تذاكر يتحقق من تذكرة راكب قرب الرصيف."
      }
    }
  }
}
```

For new dedicated scenes, prefer 5:3 with the main action near the center. After adding the file and mapping, run `npm run build` and `npm run db:sync`. The build fingerprints the file and includes it in the offline course. The database records where each scene is used, including cover or turn number. Run `npm run db:scene -- idea-travel-01` to see a scene's uses.

## Advanced practice collection

The second collection adds 100 independent WebP photographs at 500 × 300, generated with the built-in image tool. The ten atlases use the same two-column, five-row geometry as the first collection. Authoring data are in `production/idea-lab-scenes.tsv` and `production/idea-lab-labels.txt`. The numbers in the latter are percentages of the cropped image, with `-` for words that have no fixed location. Each advanced scene includes a bilingual example that uses a specific course pattern.

The common generation prompt requested an exact portrait 1024 × 1536 atlas with two equal columns and five equal rows, boundaries at x=512 and y=307, 614, 922, 1229, and no borders or captions. It requested medium-wide documentary photographs in contemporary Arab communities with culturally modest clothing and clearly visible objects. The individual photo descriptions follow in reading order.

### Household routines (routine)

1. Man hanging a jacket by front door before leaving, keys bowl and backpack visible
2. woman filling reusable water bottle at kitchen sink, lunch box and tap
3. father sorting lights and darks beside washing machine and laundry basket
4. siblings rearranging a crowded pantry with glass jars and labels without text
5. man checking the vacuum filter with brush and dust bin
6. adult fixing a dripping tap with wrench and towel, bucket below
7. person moving a potted plant away from bright window, curtain and saucer
8. family setting a breakfast tray for a guest with honey and warm bread
9. two adults comparing a wall calendar and weekly checklist at home
10. man switching off a desk lamp before bed with phone and open book

### Orders and services (market)

1. Customer asking a shopkeeper for a receipt at checkout with paper receipt and card terminal
2. worker wrapping a fragile mug at a packing counter with paper and box
3. woman comparing two umbrellas at market stall, folded and open
4. mechanic giving repair estimate beside bicycle and clipboard
5. customer exchanging a jacket with shop assistant, two jackets and receipt
6. grocer showing two bags of rice on scale with scoop
7. shopper returning an empty glass jar at refill counter with dispenser
8. customer asking tailor to move a button, jacket and sewing tools
9. worker preparing click-and-collect order behind pickup counter with boxed goods
10. two shoppers choosing a ripe melon at a fruit stand, tray and scale

### Travel and problem solving (journey)

1. Passenger checking two train tickets with conductor next to train doorway
2. driver and rider loading suitcase into taxi trunk
3. traveler asking airport agent about a delayed flight, counter and suitcase
4. woman stepping off city bus with shopping bag, stop sign and open doors
5. hotel guest moving suitcase to luggage storage, shelves and numbered tags with no legible text
6. traveler plugging phone into station charger, bench and suitcase
7. two travelers choosing a walking route beside a city canal map, footbridge visible
8. man searching for passport in backpack on terminal bench, documents
9. travelers arranging bags on train luggage rack, seating visible
10. adult asking a station attendant how to use ticket machine, ticket and screen

### Learning and discussion (classroom)

1. Two students reviewing a mistake in a workbook with red pen and calculator
2. teacher demonstrating paper recycling with two sorting bins and used paper
3. young woman comparing an old map and a new map in library
4. classmates taking turns speaking into a microphone on a study desk
5. student borrowing calculator at class desk with worksheets and pencils
6. science teacher showing a magnet attracting paper clips, ruler and metal clips
7. group highlighting key details on a reading passage with highlighters and colored notes
8. student drawing a timeline across a whiteboard with colored magnets, no readable text
9. tutor helping a student record a short speaking exercise with phone and notebook
10. students putting their desks into a circle with empty chairs visible

### Team planning and work (team)

1. Two coworkers comparing a printed calendar and a deadline board with colored markers
2. supervisor demonstrating safety gloves and eye protection in warehouse
3. team reviewing checklist before opening a new kiosk, closed shutter and key
4. colleague showing a visitor which way to go on a building floor plan
5. office worker correcting an error in a printed invoice beside a laptop and calculator
6. two coworkers moving a meeting to a small room with projector and chairs
7. technician testing a replacement monitor cable beside open equipment box
8. staff handing over a shift with clipboard and keys
9. supervisor acknowledging a colleague's finished display with neatly organized supplies
10. coworker reporting a cracked box at dispatch station, packing tape and shipping label

### Neighborhood and public services (civic)

1. Two neighbors helping lift a bookshelf through a doorway, gloves and dolly
2. visitor leaving an umbrella at a community center entrance, rack and mat
3. volunteer guiding an older visitor to accessible ramp, railing and entrance
4. parents arranging books at a free neighborhood shelf, crate and bench
5. cyclist asking a neighbor for a bicycle pump, tire and rack
6. postal worker checking a package address with a resident, box and scanner
7. community volunteer giving out water bottles at outdoor information table
8. resident returning a misplaced key to building receptionist, key ring and counter
9. two neighbors planning which notice to place on a community bulletin board, paper and pins
10. volunteer showing a visitor the bus timetable near a public library, bus stop and route board

### Outdoor situations (field)

1. Hikers changing route beside a closed path barrier, map and rocky path
2. gardener tying a tall tomato plant to a stake, twine and watering can
3. volunteers measuring the width of a garden path with tape measure
4. father and child putting seed and water in a bird feeder, feeder and jug
5. adult sheltering a picnic table with a tarp while wind blows, rope and basket
6. two hikers showing a reusable flask and checking water remaining, backpack and trail
7. family checking tide from a safe coastal promenade, rail and waves
8. person planting a young tree with shovel and bucket, small tree centered
9. volunteer marking collection points on an outdoor trail map, signposts and clipboard
10. farmers sorting bruised and ripe fruit into separate crates, apple tree nearby

### Appointments and healthy habits (care)

1. Patient asking a clinic clerk to move an appointment, appointment card and desk calendar
2. father setting a reminder next to a glass of water and medicine box at home
3. adult comparing two pairs of reading glasses at optician, mirror and case
4. patient showing a sore wrist to a physiotherapist, wrist support and chair
5. trainer demonstrating a gentle shoulder stretch to a man in a gym, wall bar and towel
6. visitor looking for the clinic elevator, lift doors and floor sign with no legible text
7. adult packing an insulated bag with cold water and lunch, ice pack and zipper
8. pharmacist checking prescription paper before giving medicine box to customer
9. parent showing a child a handwashing technique at sink, soap and towel
10. joggers pausing in shade at park, bench and water bottles

### Tools, testing and repairs (workshop)

1. Carpenter marking a board with a pencil before cutting, ruler and clamp
2. bike mechanic checking air pressure on a bicycle tire, gauge and pump
3. potter comparing a cracked bowl and a new bowl, clay and shelf
4. two makers testing a paper bridge with coins, paper bridge and coin stack
5. technician plugging a charger into a repaired phone with cable and workbench
6. cobbler comparing two shoe soles, needle and shoe on counter
7. tailor pinning a hem on a long skirt laid flat on the table, pins and ruler
8. adult using a level to check a wall shelf, level and bracket
9. repair worker showing customer a new handle on a suitcase, loose handle and tools
10. student cleaning a camera lens with a cloth, camera and case

### Events and hospitality (gathering)

1. Two organizers counting empty seats before a talk, rows and clipboard
2. host placing an extra chair beside family dining table, plates and water jug
3. volunteer showing late guest a side entrance to a hall, door and sign
4. family moving picnic food indoors after rain, wet windows and baskets
5. speaker testing a microphone beside podium before a presentation, cable and empty seats
6. two hosts setting up separate trays for guests, tea glasses and dates
7. staff placing a welcome sign near a coat rack, stand and jackets, no readable words
8. young man lending a pen to another visitor at sign-in table, name badges and register
9. organizers comparing two room layouts with miniature chairs and paper plan
10. attendees collecting leftover food containers after an event, stack of boxes and table

## From waking up to school (morning)

Six new scenes were generated with the built-in image tool as one square atlas, with two columns and three rows. The final files are `public/assets/scenes/idea-lab/morning-01.webp` through `morning-06.webp`. Like the other scenes, they use 500 × 300 WebP frames and positions measured against those frames.

Prompt set for the atlas, left to right and top to bottom. Use separate candid photographs in a contemporary Arab setting, modest long-sleeved clothing, exact grid boundaries, and no captions, margins or logos. Keep essential objects within the middle of each cell.

1. Man waking at dawn, reaching for an alarm clock beside a lamp, with blanket and curtains.
2. Dressed man on the edge of a neat bed putting on slippers, with a rug and pillow.
3. Boy brushing his teeth by a sink, with a faucet, toothpaste, cup and towel.
4. Father and son at the school entrance, with a backpack, books and steps.
5. Man turning off a bedside lamp at night, with a pillow, blanket, book and dark window.
6. Two classmates introducing themselves in a school corridor, with backpacks, a doorway and a notebook.

Additional bilingual scene exercises live in `production/idea-pattern-practice.tsv`. Each row links an existing scene ID to a lesson ID, a contextual example, and a speaking task in both languages. The builder validates coverage of all published patterns. The same content is used for the SQLite import and the offline collection.
