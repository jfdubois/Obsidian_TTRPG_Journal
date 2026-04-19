# How to Create Entity Notes

## Purpose

This guide explains how to create entity notes, when to use each entity type, and how those notes appear in the vault.

## Prerequisites

Before using this workflow:

- open the relevant `Campaign.md` note or a session note in the correct campaign
- decide which entity type you want to create
- gather the basic information you want to record, such as name, description, and relationships

## Create an Entity from a Campaign Note

Use this method when you want to create a structured note directly from the campaign hub.

1. Open the relevant `Campaign.md` note.
2. Click `Add Entity`.
3. Select the entity type.
4. Enter the entity details in the form.
5. Confirm the form to create the note.

## Create an Entity from a Session Note

Use this method when a new name appears during play.

1. In a session note, type a new wikilink such as `[[Captain Elira]]`.
2. Open or create that new note from the link.
3. Complete the entity form.

This is useful when you discover a new person, place, faction, or quest during a session and want to turn it into a proper note immediately.

## Entity Types

The entity form supports these types:

- `Character`
- `NPC`
- `Place`
- `Store`
- `Faction`
- `Region`
- `Plane`
- `Quest`

Choose the type that best matches how you want the note to behave in the vault.

## How Entity Notes Affect the Vault

Entity notes do more than store information. They also update campaign views and other workflows.

- `Character` notes appear in the `Players` section of `Campaign.md` when a player name is filled in.
- `Character` notes are available in the initiative form during encounters.
- entity notes appear in the `Campaign knowledge` section of `Campaign.md`
- `Quest`, `Faction`, `Plane`, `Region`, and `Place` notes can be linked to other notes through the form fields
- when an entity is created from a session note, the note can automatically record where it was introduced

## Character Notes

Use the `Character` type for player characters.

To make a character appear properly in the campaign tools:

1. Select `Character` as the type.
2. Enter the character name.
3. Fill in `Player's name`.
4. Add any other details you want to track, such as race, class, faction, or description.

When `Player's name` is filled in:

- the character appears in the `Players` section of `Campaign.md`
- the character becomes selectable in the initiative tracker during encounters in that campaign

## Location Structure

Location-related notes can be layered inside one another, like nested locations.

Use the fields this way:

- `Plane` for the broadest location
- `Region` for an area inside a plane
- `Location` for a specific place inside a region or another place

Example:

- create a `Place` note for the city
- create another `Place` note for the sewer
- set the sewer note's `Location` field to the city

This lets you represent locations inside other locations, such as a sewer under a city, a temple inside a district, or a room inside a castle.

## Place and Store Notes

- use `Place` for general locations such as a city, village, ruin, dungeon, or landmark
- use `Store` for a business or vendor location

Both can be linked to larger locations through the location fields in the form.

## Result

At the end of this process, you have an entity note that is linked to the right campaign and can appear in the parts of the vault that use that entity type.
