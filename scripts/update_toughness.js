/**
 * Update Toughness Substat for All Animals
 * This script updates the toughness substat values in MongoDB
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Toughness stats data
const toughnessStats = {
    "Honey Badger": 100.0,
    "Wolverine": 98.0,
    "Tasmanian Devil": 96.5,
    "Hyena": 95.5,
    "Cape Buffalo": 95.0,
    "Red Fox": 94.2,
    "Wild Boar": 94.0,
    "Warthog": 93.5,
    "Black Rhinoceros": 93.0,
    "Rhinoceros": 93.0,
    "Bactrian Camel": 92.6,
    "African Elephant": 92.5,
    "Hippopotamus": 92.0,
    "Camel": 91.1,
    "Grizzly Bear": 91.0,
    "Polar Bear": 90.5,
    "Gorilla": 90.0,
    "Siberian Tiger": 89.8,
    "Snow Leopard": 89.6,
    "Armadillo": 89.3,
    "Bison": 89.0,
    "Camel Spider": 88.5,
    "Musk Ox": 88.5,
    "Yak": 88.5,
    "Moose": 88.0,
    "Walrus": 87.5,
    "Fennec Fox": 87.2,
    "Pangolin": 86.8,
    "Jaguar": 85.3,
    "Sea Lion": 85.2,
    "Box Jellyfish": 84.8,
    "Sun Bear": 80.8,
    "Tiger Shark": 80.6,
    "Clouded Leopard": 80.0,
    "Galapagos Tortoise": 80.0,
    "Wildebeest": 78.7,
    "Arctic Fox": 77.2,
    "Snapping Turtle": 76.9,
    "Emperor Scorpion": 76.0,
    "Leopard": 75.9,
    "Lionfish": 74.6,
    "Cougar": 74.3,
    "Black Bear": 74.2,
    "Ibex": 73.9,
    "Gray Wolf": 72.9,
    "King Crab": 72.8,
    "Spectacled Bear": 72.6,
    "Leatherback Sea Turtle": 72.2,
    "Oryx": 72.2,
    "Kudu": 71.9,
    "African Lion": 71.8,
    "Sloth Bear": 71.7,
    "Deathstalker Scorpion": 71.5,
    "Porcupine": 71.4,
    "Hedgehog": 71.3,
    "Coconut Crab": 70.2,
    "Lobster": 70.2,
    "Mountain Goat": 68.0,
    "Coyote": 66.4,
    "Bighorn Sheep": 66.3,
    "Jackal": 66.0,
    "Arctic Wolf": 65.8,
    "Dhole": 65.5,
    "Sable Antelope": 63.8,
    "Dingo": 58.9,
    "Maned Wolf": 58.7,
    "King Cobra": 58.2,
    "Monitor Lizard": 57.5,
    "African Wild Dog": 56.3,
    "Impala": 53.5,
    "Vulture": 53.3,
    "Harpy Eagle": 52.8,
    "Macaw": 52.6,
    "Seal": 52.3,
    "Skunk": 52.0,
    "Poison Dart Frog": 51.7,
    "Kiwi": 51.6,
    "Black Mamba": 51.5,
    "Peacock": 51.5,
    "Anaconda": 51.4,
    "Great Horned Owl": 51.2,
    "Octopus": 51.0,
    "Cockatoo": 50.3,
    "Piranha": 50.1,
    "Donkey": 49.8,
    "Mongoose": 49.6,
    "Zebra": 49.6,
    "Okapi": 49.5,
    "Capybara": 49.2,
    "Opossum": 49.0,
    "Python": 48.7,
    "Beaver": 48.6,
    "Flamingo": 47.5,
    "Badger": 47.4,
    "Baboon": 47.2,
    "Blue Whale": 47.2,
    "Stingray": 46.7,
    "Gaboon Viper": 46.6,
    "Kookaburra": 46.6,
    "Colossal Squid": 45.9,
    "Sailfish": 45.6,
    "Raven": 45.5,
    "Swordfish": 45.5,
    "Kangaroo": 45.4,
    "Komodo Dragon": 45.3,
    "Wombat": 45.2,
    "Caracal": 44.7,
    "Gila Monster": 44.5,
    "Wallaby": 44.5,
    "Anglerfish": 44.3,
    "Axolotl": 44.0,
    "Serval": 43.9,
    "Peregrine Falcon": 43.3,
    "Japanese Macaque": 43.2,
    "Mandrill": 43.0,
    "Bongo": 42.7,
    "Pufferfish": 42.7,
    "Saltwater Crocodile": 42.6,
    "Condor": 41.8,
    "Crow": 41.6,
    "Magpie": 41.4,
    "Emperor Penguin": 41.3,
    "Gazelle": 41.1,
    "Otter": 40.4,
    "Gecko": 40.1,
    "Sawfish": 40.1,
    "Lynx": 39.8,
    "Pelican": 39.7,
    "Orangutan": 39.2,
    "Stork": 38.8,
    "Bullfrog": 38.6,
    "Toucan": 38.5,
    "Chimpanzee": 38.0,
    "Guanaco": 37.7,
    "Stoat": 37.7,
    "Emu": 37.5,
    "Salamander": 36.9,
    "Puffin": 36.3,
    "Llama": 36.1,
    "Reindeer": 36.1,
    "Alligator": 36.0,
    "Meerkat": 36.0,
    "Rattlesnake": 35.7,
    "Red-Eyed Tree Frog": 35.6,
    "Black Widow": 35.4,
    "Gibbon": 35.4,
    "Golden Eagle": 35.0,
    "Bald Eagle": 34.5,
    "Beluga Whale": 34.5,
    "Goose": 33.9,
    "Raccoon": 33.9,
    "Barn Owl": 33.2,
    "Albatross": 33.1,
    "Electric Eel": 33.0,
    "Cassowary": 32.6,
    "Reticulated Python": 31.9,
    "Swan": 31.9,
    "Giraffe": 31.7,
    "Hummingbird": 31.7,
    "Goliath Birdeater": 31.6,
    "Pronghorn": 31.5,
    "Ring-tailed Lemur": 31.4,
    "Bull Shark": 31.2,
    "Sugar Glider": 31.1,
    "Bottlenose Dolphin": 30.9,
    "Quoll": 30.8,
    "Alpaca": 30.7,
    "Cheetah": 30.2,
    "Moray Eel": 29.8,
    "Great White Shark": 29.7,
    "Boa Constrictor": 29.6,
    "Megalodon": 29.6,
    "Ostrich": 28.6,
    "Ocelot": 28.3,
    "Elk": 28.2,
    "Green Anaconda": 28.2,
    "Hellbender": 28.2,
    "Manta Ray": 28.2,
    "Red-tailed Hawk": 28.1,
    "Spider Monkey": 28.1,
    "Iguana": 28.0,
    "Cuttlefish": 27.3,
    "Sea Otter": 27.0,
    "Naked Mole Rat": 26.7,
    "Osprey": 26.4,
    "Howler Monkey": 26.0,
    "Quokka": 26.0,
    "Shoebill": 24.9,
    "Hammerhead Shark": 24.7,
    "Nautilus": 24.7,
    "Narwhal": 24.2,
    "Red Panda": 24.2,
    "Bobcat": 24.1,
    "Dragonfly": 24.1,
    "Chameleon": 23.9,
    "Praying Mantis": 23.4,
    "Tapir": 23.2,
    "Tuna": 23.1,
    "Capuchin Monkey": 23.0,
    "Mantis Shrimp": 23.0,
    "Secretary Bird": 23.0,
    "Ferret": 22.9,
    "Marlin": 22.2,
    "Army Ant": 22.1,
    "Barracuda": 21.8,
    "Snowy Owl": 21.8,
    "Manatee": 21.4,
    "Anteater": 21.3,
    "Stag Beetle": 21.2,
    "Proboscis Monkey": 21.1,
    "Orca": 20.7,
    "Hornet": 20.6,
    "Sloth": 20.6,
    "Wild Horse": 20.6,
    "Platypus": 20.0,
    "Flying Squirrel": 18.5,
    "Tarantula Hawk": 17.5,
    "Giant Squid": 16.1,
    "Koala": 15.6,
    "Huntsman Spider": 14.9,
    "Monarch Butterfly": 14.9,
    "Hercules Beetle": 13.2,
    "Bullet Ant": 6.9,
    "Black Panther": 5.7,
    "Giant Centipede": 5.7
};

async function updateToughness() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!\n');

        const db = mongoose.connection.db;
        const collection = db.collection('animals');

        let updated = 0;
        let notFound = [];

        for (const [animalName, toughness] of Object.entries(toughnessStats)) {
            const result = await collection.updateOne(
                { name: animalName },
                { $set: { 'substats.toughness': toughness } }
            );

            if (result.matchedCount > 0) {
                updated++;
                console.log(`✓ Updated ${animalName}: toughness = ${toughness}`);
            } else {
                notFound.push(animalName);
                console.log(`✗ Not found: ${animalName}`);
            }
        }

        console.log('\n========== SUMMARY ==========');
        console.log(`Total animals in data: ${Object.keys(toughnessStats).length}`);
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

updateToughness();
