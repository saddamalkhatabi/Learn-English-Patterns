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
