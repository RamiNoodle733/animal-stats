/**
 * Update Weaponry Substat for All Animals
 * This script updates the weaponry substat values in MongoDB
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Weaponry stats data
const weaponryStats = {
    "Box Jellyfish": 100.0,
    "King Cobra": 98.5,
    "Black Mamba": 97.5,
    "Gaboon Viper": 97.0,
    "Poison Dart Frog": 96.5,
    "Deathstalker Scorpion": 96.0,
    "Pufferfish": 95.5,
    "Electric Eel": 95.0,
    "Mantis Shrimp": 94.5,
    "Komodo Dragon": 94.0,
    "Saltwater Crocodile": 93.5,
    "Great White Shark": 93.0,
    "Bull Shark": 92.5,
    "Jaguar": 92.0,
    "Tiger Shark": 92.0,
    "Hammerhead Shark": 91.5,
    "Alligator": 91.0,
    "Siberian Tiger": 91.0,
    "Hippopotamus": 90.5,
    "African Lion": 90.0,
    "Black Rhinoceros": 90.0,
    "Bullet Ant": 90.0,
    "Rattlesnake": 90.0,
    "Rhinoceros": 90.0,
    "Camel Spider": 89.2,
    "Leopard": 89.0,
    "Snow Leopard": 88.5,
    "Bullfrog": 88.3,
    "Cougar": 88.0,
    "Gila Monster": 88.0,
    "Lionfish": 88.0,
    "Stingray": 88.0,
    "Tarantula Hawk": 88.0,
    "Honey Badger": 87.5,
    "Red-Eyed Tree Frog": 87.4,
    "Hornet": 87.0,
    "Hyena": 87.0,
    "Wolverine": 87.0,
    "Moray Eel": 86.2,
    "Platypus": 84.8,
    "Arctic Wolf": 83.0,
    "Grizzly Bear": 82.5,
    "Spider Monkey": 79.7,
    "Emperor Scorpion": 79.3,
    "Sea Lion": 79.0,
    "Gray Wolf": 77.2,
    "Vulture": 76.0,
    "Howler Monkey": 75.5,
    "Coconut Crab": 73.9,
    "Sun Bear": 73.5,
    "Wildebeest": 73.4,
    "Clouded Leopard": 72.5,
    "Peregrine Falcon": 72.3,
    "Snapping Turtle": 72.2,
    "Hedgehog": 71.0,
    "King Crab": 70.9,
    "Huntsman Spider": 70.8,
    "Pangolin": 70.0,
    "Polar Bear": 69.1,
    "Leatherback Sea Turtle": 68.9,
    "Great Horned Owl": 67.8,
    "Ibex": 67.4,
    "African Elephant": 66.7,
    "Walrus": 66.2,
    "Porcupine": 65.8,
    "Galapagos Tortoise": 65.3,
    "Black Bear": 65.2,
    "Oryx": 65.2,
    "Moose": 65.0,
    "Osprey": 65.0,
    "Kudu": 64.9,
    "Harpy Eagle": 64.0,
    "Spectacled Bear": 63.3,
    "Golden Eagle": 63.1,
    "Snowy Owl": 62.7,
    "Sloth Bear": 62.1,
    "Barn Owl": 62.0,
    "Fennec Fox": 61.0,
    "Maned Wolf": 60.9,
    "Bald Eagle": 60.4,
    "Cape Buffalo": 60.3,
    "Mountain Goat": 60.0,
    "Red-tailed Hawk": 58.9,
    "Sailfish": 58.9,
    "Bison": 58.4,
    "Bighorn Sheep": 57.9,
    "Arctic Fox": 57.5,
    "Jackal": 57.5,
    "Praying Mantis": 56.2,
    "Red Fox": 55.2,
    "Sable Antelope": 54.7,
    "Dingo": 54.6,
    "Elk": 54.4,
    "Lobster": 52.9,
    "Sawfish": 52.1,
    "Cuttlefish": 51.8,
    "Armadillo": 51.0,
    "Mongoose": 50.5,
    "Sloth": 49.1,
    "Impala": 48.7,
    "Macaw": 48.0,
    "Seal": 47.7,
    "Dhole": 47.6,
    "Skunk": 47.4,
    "Peacock": 47.0,
    "Anaconda": 46.9,
    "Musk Ox": 46.9,
    "Coyote": 46.3,
    "Cockatoo": 46.0,
    "Piranha": 45.8,
    "Donkey": 45.6,
    "Okapi": 45.3,
    "Red Panda": 45.2,
    "Capybara": 45.0,
    "Colossal Squid": 44.8,
    "Opossum": 44.8,
    "Python": 44.6,
    "Beaver": 44.5,
    "Tasmanian Devil": 44.0,
    "Badger": 43.5,
    "Flamingo": 43.5,
    "Baboon": 43.3,
    "Blue Whale": 43.3,
    "Flying Squirrel": 43.2,
    "Kookaburra": 42.8,
    "Yak": 42.3,
    "Meerkat": 42.0,
    "Raven": 41.9,
    "Kangaroo": 41.8,
    "Wombat": 41.6,
    "Caracal": 41.2,
    "Wild Boar": 41.1,
    "Wallaby": 41.0,
    "Axolotl": 40.5,
    "Serval": 40.5,
    "Ferret": 40.4,
    "Japanese Macaque": 39.9,
    "Mandrill": 39.7,
    "Bongo": 39.4,
    "Kiwi": 38.8,
    "Condor": 38.7,
    "Crow": 38.5,
    "Proboscis Monkey": 38.4,
    "Magpie": 38.3,
    "Hummingbird": 38.0,
    "Otter": 37.5,
    "Lynx": 37.0,
    "Giant Squid": 36.9,
    "Toucan": 36.6,
    "Orangutan": 36.4,
    "Swan": 36.2,
    "Gorilla": 36.1,
    "Stork": 36.1,
    "Chimpanzee": 35.5,
    "Warthog": 35.5,
    "Reindeer": 35.4,
    "Guanaco": 35.2,
    "Stoat": 35.2,
    "Emu": 35.0,
    "Puffin": 34.8,
    "Salamander": 34.5,
    "African Wild Dog": 34.4,
    "Black Widow": 33.2,
    "Gibbon": 33.2,
    "Beluga Whale": 32.5,
    "Naked Mole Rat": 32.1,
    "Raccoon": 31.9,
    "Albatross": 31.2,
    "Gecko": 30.9,
    "Wild Horse": 30.9,
    "Cassowary": 30.8,
    "Bactrian Camel": 30.2,
    "Reticulated Python": 30.2,
    "Pronghorn": 29.8,
    "Camel": 29.6,
    "Sugar Glider": 29.5,
    "Bottlenose Dolphin": 29.4,
    "Emperor Penguin": 29.4,
    "Koala": 29.4,
    "Quoll": 29.3,
    "Goose": 28.9,
    "Cheetah": 28.7,
    "Boa Constrictor": 28.2,
    "Goliath Birdeater": 28.2,
    "Megalodon": 28.2,
    "Dragonfly": 27.9,
    "Ostrich": 27.4,
    "Ocelot": 27.1,
    "Green Anaconda": 27.0,
    "Hellbender": 27.0,
    "Iguana": 26.8,
    "Sea Otter": 26.0,
    "Anglerfish": 25.8,
    "Swordfish": 25.7,
    "Army Ant": 25.6,
    "Manta Ray": 25.5,
    "Capuchin Monkey": 25.3,
    "Monitor Lizard": 25.3,
    "Quokka": 25.1,
    "Anteater": 24.5,
    "Stag Beetle": 24.4,
    "Shoebill": 24.2,
    "Nautilus": 24.0,
    "Pelican": 23.7,
    "Narwhal": 23.6,
    "Bobcat": 23.5,
    "Chameleon": 23.4,
    "Octopus": 22.9,
    "Tapir": 22.7,
    "Tuna": 22.7,
    "Marlin": 21.9,
    "Ring-tailed Lemur": 21.8,
    "Barracuda": 21.6,
    "Manatee": 21.2,
    "Gazelle": 21.0,
    "Orca": 20.6,
    "Llama": 20.1,
    "Secretary Bird": 19.0,
    "Zebra": 18.8,
    "Monarch Butterfly": 16.9,
    "Hercules Beetle": 14.8,
    "Alpaca": 12.9,
    "Giraffe": 12.3,
    "Black Panther": 5.8,
    "Giant Centipede": 5.8
};

async function updateWeaponry() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!\n');

        const db = mongoose.connection.db;
        const collection = db.collection('animals');

        let updated = 0;
        let notFound = [];

        for (const [animalName, weaponry] of Object.entries(weaponryStats)) {
            const result = await collection.updateOne(
                { name: animalName },
                { $set: { 'substats.weaponry': weaponry } }
            );

            if (result.matchedCount > 0) {
                updated++;
                console.log(`✓ Updated ${animalName}: weaponry = ${weaponry}`);
            } else {
                notFound.push(animalName);
                console.log(`✗ Not found: ${animalName}`);
            }
        }

        console.log('\n========== SUMMARY ==========');
        console.log(`Total animals in data: ${Object.keys(weaponryStats).length}`);
        console.log(`Successfully updated: ${updated}`);
        console.log(`Not found: ${notFound.length}`);
        
        if (notFound.length > 0) {
            console.log('\nAnimals not found in database:');
            notFound.forEach(name => console.log(`  - ${name}`));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

updateWeaponry();
