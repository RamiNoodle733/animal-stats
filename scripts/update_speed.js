/**
 * Update Speed Substat for All Animals
 * This script updates the speed substat values in MongoDB
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Speed stats data
const speedStats = {
    "Peregrine Falcon": 100.0,
    "Sailfish": 99.0,
    "Golden Eagle": 98.5,
    "Swordfish": 98.5,
    "Bald Eagle": 98.0,
    "Marlin": 98.0,
    "Harpy Eagle": 97.5,
    "Red-tailed Hawk": 97.0,
    "Cheetah": 96.5,
    "Vulture": 96.5,
    "Pronghorn": 95.5,
    "Hummingbird": 95.0,
    "Dragonfly": 94.5,
    "Gazelle": 94.5,
    "Impala": 94.0,
    "Ostrich": 93.0,
    "Tuna": 93.0,
    "Wild Horse": 92.5,
    "Sable Antelope": 92.0,
    "Wildebeest": 88.5,
    "Albatross": 80.5,
    "Howler Monkey": 74.6,
    "Tarantula Hawk": 74.4,
    "Condor": 73.7,
    "Manta Ray": 67.1,
    "Great Horned Owl": 65.4,
    "Praying Mantis": 59.5,
    "Snowy Owl": 59.2,
    "Ring-tailed Lemur": 59.1,
    "Mantis Shrimp": 58.8,
    "Barn Owl": 58.4,
    "Army Ant": 57.4,
    "Goliath Birdeater": 57.2,
    "Monitor Lizard": 56.7,
    "Anteater": 56.0,
    "Goose": 56.0,
    "Stag Beetle": 55.9,
    "Hornet": 55.0,
    "Narwhal": 54.9,
    "Alligator": 54.5,
    "Swan": 54.5,
    "Emperor Penguin": 54.2,
    "Mongoose": 52.5,
    "Sloth": 49.1,
    "Armadillo": 49.0,
    "Hedgehog": 48.8,
    "Lionfish": 48.5,
    "Macaw": 48.0,
    "Giant Squid": 47.7,
    "Skunk": 47.4,
    "Poison Dart Frog": 47.2,
    "Peacock": 47.0,
    "Anaconda": 46.9,
    "Dhole": 46.9,
    "Fennec Fox": 46.7,
    "Octopus": 46.6,
    "Galapagos Tortoise": 46.3,
    "Manatee": 46.3,
    "Mountain Goat": 46.2,
    "Oryx": 46.2,
    "Porcupine": 46.2,
    "Black Mamba": 46.1,
    "Cockatoo": 46.0,
    "Monarch Butterfly": 45.8,
    "Piranha": 45.8,
    "Donkey": 45.6,
    "Leopard": 45.5,
    "Okapi": 45.3,
    "Zebra": 45.3,
    "Red Panda": 45.2,
    "Capybara": 45.0,
    "Opossum": 44.8,
    "Dingo": 44.6,
    "Python": 44.6,
    "Beaver": 44.5,
    "Snow Leopard": 44.5,
    "Camel Spider": 44.1,
    "Tasmanian Devil": 44.0,
    "Badger": 43.5,
    "Flamingo": 43.5,
    "Baboon": 43.3,
    "Beluga Whale": 43.3,
    "Flying Squirrel": 43.2,
    "Hercules Beetle": 43.0,
    "Stingray": 42.9,
    "Blue Whale": 42.8,
    "Kookaburra": 42.8,
    "Colossal Squid": 42.2,
    "Saltwater Crocodile": 42.1,
    "Sea Lion": 42.1,
    "Raven": 41.9,
    "Kangaroo": 41.8,
    "Komodo Dragon": 41.7,
    "Wombat": 41.6,
    "Caracal": 41.2,
    "Wild Boar": 41.1,
    "Gila Monster": 41.0,
    "Wallaby": 41.0,
    "Anglerfish": 40.8,
    "Axolotl": 40.5,
    "Serval": 40.5,
    "Maned Wolf": 40.2,
    "Japanese Macaque": 39.9,
    "Mandrill": 39.7,
    "King Cobra": 39.5,
    "Bongo": 39.4,
    "Pelican": 39.4,
    "Pufferfish": 39.4,
    "Jackal": 38.8,
    "Tiger Shark": 38.8,
    "Honey Badger": 38.6,
    "Crow": 38.5,
    "Proboscis Monkey": 38.4,
    "Black Bear": 38.3,
    "Magpie": 38.3,
    "Hyena": 38.1,
    "Grizzly Bear": 37.9,
    "Otter": 37.5,
    "Sawfish": 37.2,
    "Lynx": 37.0,
    "Clouded Leopard": 36.9,
    "Emu": 36.4,
    "Orangutan": 36.4,
    "Gorilla": 36.1,
    "Seal": 36.1,
    "Stork": 36.1,
    "Bullfrog": 36.0,
    "Puffin": 36.0,
    "Walrus": 35.7,
    "Bactrian Camel": 35.6,
    "Chimpanzee": 35.5,
    "Warthog": 35.5,
    "Guanaco": 35.2,
    "Stoat": 35.2,
    "Ibex": 34.5,
    "Salamander": 34.5,
    "African Wild Dog": 34.4,
    "Jaguar": 34.0,
    "Llama": 33.8,
    "Reindeer": 33.8,
    "Meerkat": 33.7,
    "Gecko": 33.5,
    "Yak": 33.5,
    "Red-Eyed Tree Frog": 33.4,
    "Arctic Fox": 33.3,
    "Black Widow": 33.2,
    "Gibbon": 33.2,
    "Box Jellyfish": 33.1,
    "Bullet Ant": 33.0,
    "Pangolin": 32.9,
    "Camel": 32.6,
    "Cape Buffalo": 32.6,
    "Wolverine": 32.5,
    "King Crab": 32.3,
    "Naked Mole Rat": 32.1,
    "Raccoon": 31.9,
    "Rattlesnake": 31.5,
    "Black Panther": 31.1,
    "Electric Eel": 31.1,
    "Giant Centipede": 31.1,
    "Hippopotamus": 30.9,
    "Reticulated Python": 30.2,
    "Bison": 30.0,
    "Cougar": 30.0,
    "Giraffe": 30.0,
    "Deathstalker Scorpion": 29.9,
    "Toucan": 29.8,
    "Bull Shark": 29.6,
    "Sugar Glider": 29.5,
    "Bottlenose Dolphin": 29.4,
    "Koala": 29.4,
    "Quoll": 29.3,
    "Alpaca": 29.1,
    "Rhinoceros": 28.6,
    "Moray Eel": 28.4,
    "Great White Shark": 28.3,
    "Boa Constrictor": 28.2,
    "Lobster": 28.2,
    "Megalodon": 28.2,
    "Spider Monkey": 28.2,
    "Arctic Wolf": 27.8,
    "Ocelot": 27.1,
    "Green Anaconda": 27.0,
    "Hellbender": 27.0,
    "Kiwi": 27.0,
    "Black Rhinoceros": 26.9,
    "Iguana": 26.8,
    "Leatherback Sea Turtle": 26.8,
    "Siberian Tiger": 26.8,
    "Cuttlefish": 26.3,
    "Sea Otter": 26.0,
    "Secretary Bird": 26.0,
    "Osprey": 25.5,
    "Capuchin Monkey": 25.3,
    "Quokka": 25.1,
    "Kudu": 25.0,
    "Coyote": 24.9,
    "Gray Wolf": 24.7,
    "Huntsman Spider": 24.6,
    "Red Fox": 24.4,
    "Moose": 24.2,
    "Shoebill": 24.2,
    "Cassowary": 24.1,
    "Hammerhead Shark": 24.0,
    "Nautilus": 24.0,
    "Musk Ox": 23.7,
    "Bobcat": 23.5,
    "Chameleon": 23.4,
    "Coconut Crab": 22.9,
    "Tapir": 22.7,
    "Ferret": 22.5,
    "Snapping Turtle": 22.3,
    "Barracuda": 21.6,
    "Bighorn Sheep": 21.4,
    "Gaboon Viper": 21.2,
    "Polar Bear": 21.2,
    "African Lion": 21.1,
    "Orca": 20.6,
    "Spectacled Bear": 20.5,
    "Emperor Scorpion": 20.1,
    "Platypus": 20.0,
    "Elk": 17.7,
    "Sloth Bear": 15.1,
    "African Elephant": 14.3,
    "Sun Bear": 14.1
};

async function updateSpeed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!\n');

        const db = mongoose.connection.db;
        const collection = db.collection('animals');

        let updated = 0;
        let notFound = [];

        for (const [animalName, speed] of Object.entries(speedStats)) {
            const result = await collection.updateOne(
                { name: animalName },
                { $set: { 'substats.speed': speed } }
            );

            if (result.matchedCount > 0) {
                updated++;
                console.log(`✓ Updated ${animalName}: speed = ${speed}`);
            } else {
                notFound.push(animalName);
                console.log(`✗ Not found: ${animalName}`);
            }
        }

        console.log('\n========== SUMMARY ==========');
        console.log(`Total animals in data: ${Object.keys(speedStats).length}`);
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

updateSpeed();
