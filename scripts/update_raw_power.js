/**
 * Update Raw Power Substat for All Animals
 * This script updates the raw_power substat values in MongoDB
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Raw Power stats data
const rawPowerStats = {
    "Megalodon": 100.0,
    "Orca": 98.5,
    "Blue Whale": 98.0,
    "African Elephant": 96.0,
    "Saltwater Crocodile": 96.0,
    "Black Rhinoceros": 95.0,
    "Great White Shark": 95.0,
    "Rhinoceros": 95.0,
    "Hippopotamus": 94.5,
    "Bull Shark": 94.0,
    "Tiger Shark": 93.5,
    "Hammerhead Shark": 92.5,
    "Cape Buffalo": 92.0,
    "Bison": 91.0,
    "Walrus": 90.0,
    "Moose": 89.0,
    "Musk Ox": 89.0,
    "Grizzly Bear": 88.5,
    "Yak": 88.5,
    "Camel Spider": 88.4,
    "Camel": 88.2,
    "Elk": 88.0,
    "Komodo Dragon": 88.0,
    "Polar Bear": 88.0,
    "Fennec Fox": 87.5,
    "Jaguar": 87.0,
    "Siberian Tiger": 86.0,
    "African Lion": 85.0,
    "Black Bear": 85.0,
    "Gorilla": 85.0,
    "Alligator": 84.7,
    "Arctic Fox": 84.5,
    "Leopard": 84.0,
    "Snow Leopard": 83.5,
    "Spectacled Bear": 83.5,
    "Narwhal": 83.3,
    "Bactrian Camel": 83.2,
    "Box Jellyfish": 83.0,
    "Lionfish": 83.0,
    "Sloth Bear": 82.5,
    "Cougar": 82.0,
    "Sun Bear": 82.0,
    "Beluga Whale": 81.9,
    "Black Panther": 77.6,
    "Red Fox": 76.4,
    "Clouded Leopard": 74.3,
    "Wildebeest": 73.4,
    "Gray Wolf": 72.3,
    "Impala": 71.3,
    "Sea Lion": 70.9,
    "Manatee": 70.3,
    "Red-tailed Hawk": 69.3,
    "Ibex": 67.4,
    "Snowy Owl": 67.4,
    "Sawfish": 67.0,
    "Vulture": 66.0,
    "Gazelle": 65.7,
    "Golden Eagle": 65.2,
    "Oryx": 65.2,
    "Kudu": 64.9,
    "Anglerfish": 64.6,
    "Coyote": 64.2,
    "Jackal": 63.8,
    "Arctic Wolf": 63.5,
    "Dhole": 63.1,
    "Sailfish": 62.5,
    "Hyena": 61.7,
    "Swordfish": 60.6,
    "Mountain Goat": 60.0,
    "Harpy Eagle": 59.2,
    "Stingray": 58.5,
    "Bighorn Sheep": 57.9,
    "Peregrine Falcon": 57.2,
    "Dingo": 54.9,
    "Sable Antelope": 54.7,
    "Maned Wolf": 54.6,
    "Barn Owl": 54.3,
    "Rattlesnake": 53.8,
    "Giant Squid": 53.2,
    "Marlin": 53.2,
    "Electric Eel": 52.0,
    "African Wild Dog": 51.6,
    "Cuttlefish": 51.6,
    "Howler Monkey": 51.2,
    "Bald Eagle": 51.0,
    "Osprey": 50.0,
    "Red-Eyed Tree Frog": 49.5,
    "Army Ant": 49.2,
    "Armadillo": 49.0,
    "Deathstalker Scorpion": 48.8,
    "Hedgehog": 48.8,
    "Moray Eel": 48.6,
    "Macaw": 48.0,
    "Gaboon Viper": 47.7,
    "Seal": 47.7,
    "Skunk": 47.4,
    "Kiwi": 47.1,
    "Peacock": 47.0,
    "Anaconda": 46.9,
    "Octopus": 46.6,
    "Mantis Shrimp": 46.4,
    "Galapagos Tortoise": 46.3,
    "Porcupine": 46.2,
    "Cockatoo": 46.0,
    "Piranha": 45.8,
    "Donkey": 45.6,
    "Mongoose": 45.4,
    "Okapi": 45.3,
    "Zebra": 45.3,
    "Capybara": 45.0,
    "Great Horned Owl": 45.0,
    "Opossum": 44.8,
    "Python": 44.6,
    "Beaver": 44.5,
    "Tasmanian Devil": 44.0,
    "Emperor Scorpion": 43.8,
    "Badger": 43.5,
    "Flamingo": 43.5,
    "Baboon": 43.3,
    "Black Mamba": 43.0,
    "Kookaburra": 42.8,
    "Colossal Squid": 42.2,
    "Raven": 41.9,
    "Giant Centipede": 41.8,
    "Kangaroo": 41.8,
    "Wombat": 41.6,
    "Caracal": 41.2,
    "Wild Boar": 41.1,
    "Gila Monster": 41.0,
    "Wallaby": 41.0,
    "Axolotl": 40.5,
    "Serval": 40.5,
    "Japanese Macaque": 39.9,
    "Mandrill": 39.7,
    "Pufferfish": 39.6,
    "Bongo": 39.4,
    "Bullet Ant": 38.8,
    "Condor": 38.7,
    "Honey Badger": 38.6,
    "Crow": 38.5,
    "Emperor Penguin": 38.3,
    "Magpie": 38.3,
    "Otter": 37.5,
    "Lynx": 37.0,
    "Pelican": 36.9,
    "Orangutan": 36.4,
    "Stork": 36.1,
    "Toucan": 35.9,
    "Chimpanzee": 35.5,
    "Warthog": 35.5,
    "Guanaco": 35.2,
    "Stoat": 35.2,
    "Emu": 35.0,
    "Salamander": 34.5,
    "Puffin": 34.0,
    "Llama": 33.8,
    "Reindeer": 33.8,
    "Meerkat": 33.7,
    "Black Widow": 33.2,
    "Gibbon": 33.2,
    "Pangolin": 32.9,
    "Wolverine": 32.5,
    "King Crab": 32.3,
    "Goose": 31.9,
    "Raccoon": 31.9,
    "Poison Dart Frog": 31.6,
    "Albatross": 31.2,
    "Gecko": 30.9,
    "Cassowary": 30.8,
    "Huntsman Spider": 30.5,
    "Reticulated Python": 30.2,
    "Swan": 30.2,
    "Giraffe": 30.0,
    "Hummingbird": 30.0,
    "Goliath Birdeater": 29.9,
    "Pronghorn": 29.8,
    "Sugar Glider": 29.5,
    "Bottlenose Dolphin": 29.4,
    "Quoll": 29.3,
    "Alpaca": 29.1,
    "Cheetah": 28.7,
    "Manta Ray": 28.4,
    "Boa Constrictor": 28.2,
    "Lobster": 28.2,
    "Praying Mantis": 28.2,
    "Ostrich": 27.4,
    "Ocelot": 27.1,
    "Green Anaconda": 27.0,
    "Hellbender": 27.0,
    "Iguana": 26.8,
    "Leatherback Sea Turtle": 26.8,
    "Ring-tailed Lemur": 26.4,
    "Anteater": 26.2,
    "Bobcat": 26.0,
    "Sea Otter": 26.0,
    "Monitor Lizard": 25.3,
    "Quokka": 25.1,
    "Shoebill": 24.2,
    "Spider Monkey": 24.1,
    "Nautilus": 24.0,
    "Chameleon": 23.4,
    "Coconut Crab": 22.9,
    "Bullfrog": 22.8,
    "Tapir": 22.7,
    "Tuna": 22.7,
    "King Cobra": 22.6,
    "Secretary Bird": 22.6,
    "Ferret": 22.5,
    "Snapping Turtle": 22.3,
    "Naked Mole Rat": 21.7,
    "Barracuda": 21.6,
    "Tarantula Hawk": 21.3,
    "Wild Horse": 20.5,
    "Dragonfly": 20.3,
    "Platypus": 20.0,
    "Red Panda": 19.2,
    "Capuchin Monkey": 18.0,
    "Stag Beetle": 18.0,
    "Hornet": 17.5,
    "Proboscis Monkey": 16.1,
    "Sloth": 15.6,
    "Flying Squirrel": 13.5,
    "Monarch Butterfly": 12.9,
    "Hercules Beetle": 11.5,
    "Koala": 10.6
};

async function updateRawPower() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!\n');

        const db = mongoose.connection.db;
        const collection = db.collection('animals');

        let updated = 0;
        let notFound = [];

        for (const [animalName, rawPower] of Object.entries(rawPowerStats)) {
            const result = await collection.updateOne(
                { name: animalName },
                { $set: { 'substats.raw_power': rawPower } }
            );

            if (result.matchedCount > 0) {
                updated++;
                console.log(`✓ Updated ${animalName}: raw_power = ${rawPower}`);
            } else {
                notFound.push(animalName);
                console.log(`✗ Not found: ${animalName}`);
            }
        }

        console.log('\n========== SUMMARY ==========');
        console.log(`Total animals in data: ${Object.keys(rawPowerStats).length}`);
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

updateRawPower();
