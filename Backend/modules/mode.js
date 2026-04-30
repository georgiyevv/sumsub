
//Activate a user's address by sending TRC10 token (hash8net)
async function activateAddress(address, indexOfSetting, tronWeb) {

}

//Rent energy for a user's address
async function rentEnergy(address, indexOfSetting, tronWeb) {
}

//Return the rented energy
async function returnEnergy(address, indexOfSetting, tronWeb) {

};

// Record data about rented energy in the file
async function saveEnergyRentalData(rentalData) {
}

// Delete data about rented energy from the file
async function deleteEnergyRentalData(rentalAddress) {

}

async function startRentalReturnScheduler(tronWeb) {
}

module.exports = {
  activateAddress,
  rentEnergy,
  returnEnergy,
  startRentalReturnScheduler
};

