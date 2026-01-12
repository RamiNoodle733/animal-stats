/**
 * Update Protection Substat for All Animals
 * This script updates the protection substat values in MongoDB
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Protection stats data
const protectionStats = {
    "Blue Whale": 100.0,
    "African Elephant": 96.0,
    "Black Rhinoceros": 95.5,
    "Rhinoceros": 95.5,
    "Hippopotamus": 95.0,
    "Walrus": 94.0,
    "Beluga Whale": 93.5,
    "Galapagos Tortoise": 93.0,
    "Manatee": 93.0,
    "Narwhal": 93.0,
    "Leatherback Sea Turtle": 92.5,
    "Snapping Turtle": 92.0,
    "Armadillo": 91.5,
    "Pangolin": 91.0,
    "Porcupine": 90.0,
    "Hedgehog": 89.0,
    "Coconut Crab": 88.0,
    "King Crab": 88.0,
    "Fennec Fox": 87.9,
    "Yak": 86.7,
    "Red Fox": 85.6,
    "Box Jellyfish": 80.2,
    "Mantis Shrimp": 79.3,
    "Bison": 78.7,
    "Cape Buffalo": 76.9,
    "Arctic Fox": 76.6,
    "Musk Ox": 76.5,
    "Bactrian Camel": 76.3,
    "Camel": 74.9,
    "Camel Spider": 74.3,
    "Emperor Scorpion": 72.5,
    "Moose": 70.9,
    "Giant Centipede": 70.0,
    "Gaboon Viper": 68.8,
    "Grizzly Bear": 68.8,
    "Green Anaconda": 67.2,
    "Deathstalker Scorpion": 66.9,
    "Black Mamba": 66.8,
    "Monitor Lizard": 66.8,
    "Dragonfly": 66.3,
    "Lobster": 65.2,
    "Spectacled Bear": 62.8,
    "Sun Bear": 62.7,
    "Black Bear": 61.9,
    "Polar Bear": 61.2,
    "Sloth Bear": 60.5,
    "Saltwater Crocodile": 60.3,
    "Electric Eel": 59.1,
    "Alligator": 58.5,
    "Komodo Dragon": 58.0,
    "Anaconda": 57.9,
    "Marlin": 57.7,
    "Stingray": 57.2,
    "Bull Shark": 54.8,
    "Swordfish": 52.1,
    "Sailfish": 51.8,
    "Great White Shark": 51.2,
    "Iguana": 49.8,
    "Reticulated Python": 49.2,
    "Sloth": 49.1,
    "Secretary Bird": 48.9,
    "Impala": 48.7,
    "Vulture": 48.6,
    "Mongoose": 48.4,
    "Praying Mantis": 48.3,
    "Harpy Eagle": 48.1,
    "Sea Lion": 48.1,
    "Macaw": 48.0,
    "Seal": 47.7,
    "Pufferfish": 47.4,
    "Skunk": 47.4,
    "Cassowary": 47.2,
    "Poison Dart Frog": 47.2,
    "Kiwi": 47.1,
    "Peacock": 47.0,
    "Dhole": 46.9,
    "Great Horned Owl": 46.7,
    "Octopus": 46.6,
    "Mountain Goat": 46.2,
    "Oryx": 46.2,
    "Cockatoo": 46.0,
    "Piranha": 45.8,
    "Python": 45.8,
    "Donkey": 45.6,
    "Leopard": 45.5,
    "Hornet": 45.4,
    "Okapi": 45.3,
    "Zebra": 45.3,
    "Red Panda": 45.2,
    "Capybara": 45.0,
    "Bullet Ant": 44.8,
    "Opossum": 44.8,
    "Dingo": 44.6,
    "Beaver": 44.5,
    "Snow Leopard": 44.5,
    "Cuttlefish": 44.1,
    "Tasmanian Devil": 44.0,
    "Emperor Penguin": 43.9,
    "Badger": 43.5,
    "Flamingo": 43.5,
    "Baboon": 43.3,
    "Flying Squirrel": 43.2,
    "Kookaburra": 42.8,
    "Emu": 42.4,
    "Colossal Squid": 42.2,
    "Raven": 41.9,
    "Kangaroo": 41.8,
    "Wombat": 41.6,
    "Rattlesnake": 41.5,
    "Caracal": 41.2,
    "Moray Eel": 41.2,
    "Wild Boar": 41.1,
    "Gila Monster": 41.0,
    "Wallaby": 41.0,
    "Anteater": 40.8,
    "Gecko": 40.8,
    "Axolotl": 40.5,
    "Serval": 40.5,
    "Anglerfish": 40.4,
    "Goose": 40.4,
    "Maned Wolf": 40.2,
    "Peregrine Falcon": 40.0,
    "Stag Beetle": 40.0,
    "Japanese Macaque": 39.9,
    "Mandrill": 39.7,
    "King Cobra": 39.5,
    "Bongo": 39.4,
    "Howler Monkey": 38.9,
    "Jackal": 38.8,
    "Condor": 38.7,
    "Honey Badger": 38.6,
    "Crow": 38.5,
    "Proboscis Monkey": 38.4,
    "Magpie": 38.3,
    "Gazelle": 38.1,
    "Hyena": 38.1,
    "Sawfish": 37.7,
    "Otter": 37.5,
    "Lynx": 37.0,
    "Clouded Leopard": 36.9,
    "Pelican": 36.9,
    "Tarantula Hawk": 36.7,
    "Giant Squid": 36.6,
    "Orangutan": 36.4,
    "Gorilla": 36.1,
    "Stork": 36.1,
    "Bullfrog": 36.0,
    "Toucan": 35.9,
    "Chimpanzee": 35.5,
    "Warthog": 35.5,
    "Manta Ray": 35.3,
    "Guanaco": 35.2,
    "Stoat": 35.2,
    "Ibex": 34.5,
    "Salamander": 34.5,
    "African Wild Dog": 34.4,
    "Jaguar": 34.0,
    "Puffin": 34.0,
    "Llama": 33.8,
    "Reindeer": 33.8,
    "Meerkat": 33.7,
    "Hammerhead Shark": 33.4,
    "Red-Eyed Tree Frog": 33.4,
    "Black Widow": 33.2,
    "Gibbon": 33.2,
    "Golden Eagle": 32.9,
    "Wolverine": 32.5,
    "Bald Eagle": 32.4,
    "Tiger Shark": 32.2,
    "Naked Mole Rat": 32.1,
    "Gray Wolf": 31.9,
    "Raccoon": 31.9,
    "Ostrich": 31.5,
    "Barn Owl": 31.3,
    "Albatross": 31.2,
    "Lionfish": 31.0,
    "Army Ant": 30.3,
    "Hummingbird": 30.1,
    "Cougar": 30.0,
    "Giraffe": 30.0,
    "Pronghorn": 29.8,
    "Sugar Glider": 29.5,
    "Bottlenose Dolphin": 29.4,
    "Koala": 29.4,
    "Quoll": 29.3,
    "Ring-tailed Lemur": 29.2,
    "Alpaca": 29.1,
    "Cheetah": 28.7,
    "Black Panther": 28.6,
    "Goliath Birdeater": 28.6,
    "Boa Constrictor": 28.2,
    "Megalodon": 28.2,
    "Spider Monkey": 28.2,
    "Arctic Wolf": 27.8,
    "Ocelot": 27.1,
    "Elk": 27.0,
    "Hellbender": 27.0,
    "Red-tailed Hawk": 27.0,
    "Monarch Butterfly": 26.9,
    "Siberian Tiger": 26.8,
    "Hercules Beetle": 26.3,
    "Sea Otter": 26.0,
    "Osprey": 25.5,
    "Capuchin Monkey": 25.3,
    "Quokka": 25.1,
    "Swan": 25.1,
    "Kudu": 25.0,
    "Coyote": 24.9,
    "Huntsman Spider": 24.6,
    "Shoebill": 24.2,
    "Nautilus": 24.0,
    "Bobcat": 23.5,
    "Chameleon": 23.4,
    "Tapir": 22.7,
    "Tuna": 22.7,
    "Wildebeest": 22.6,
    "Ferret": 22.5,
    "Barracuda": 21.6,
    "Snowy Owl": 21.5,
    "Bighorn Sheep": 21.4,
    "African Lion": 21.1,
    "Sable Antelope": 20.8,
    "Orca": 20.6,
    "Wild Horse": 20.5,
    "Platypus": 20.0
};

async function updateProtection() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!\n');

        const db = mongoose.connection.db;
        const collection = db.collection('animals');

        let updated = 0;
        let notFound = [];

        for (const [animalName, protection] of Object.entries(protectionStats)) {
            const result = await collection.updateOne(
                { name: animalName },
                { $set: { 'substats.protection': protection } }
            );

            if (result.matchedCount > 0) {
                updated++;
                console.log(`✓ Updated ${animalName}: protection = ${protection}`);
            } else {
                notFound.push(animalName);
                console.log(`✗ Not found: ${animalName}`);
            }
        }

        console.log('\n========== SUMMARY ==========');
        console.log(`Total animals in data: ${Object.keys(protectionStats).length}`);
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

updateProtection();
