require("dotenv").config();
const express = require("express");
const axios = require("axios");


const app = express();
const port = 3000;

const API_KEY = process.env.API_KEY;

app.get("/odds", async (req, res) => {
    try {
        const response = await axios.get(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=uk&markets=h2h&apiKey=${API_KEY}`);
        const odds = response.data;

        console.log(JSON.stringify(odds, null, 2));

        odds.forEach(event => findArbitrage(event));

        res.json(odds);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }

        res.status(500).json({ error: 'Error fetching data', details: error.message });
    }
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})

function findArbitrage(event) {
    if(!event.bookmakers || event.bookmakers.length < 1) {
        console.log(`No bookmakers found for ${event}`);
        return;
    }

    let bestOddsA = null;
    let bestOddsB = null;

    event.bookmakers.forEach((bookmaker) => {
        // for each book maker
        // iterate through their markets

        if (!bookmaker.markets || bookmaker.markets.length === 0 || !bookmaker.markets[0].outcomes) {
            console.log(`No valid markets or outcomes for bookmaker ${bookmaker.key}`);
            return;
        }

        // teams does not exist in event object, home_team and away_team
        const oddsA = bookmaker.markets[0].outcomes.find(outcome => outcome.name === event.teams[0])?.price;
        const oddsB = bookmaker.markets[0].outcomes.find(outcome => outcome.name === event.teams[1])?.price;

        if(!bestOddsA || oddsA > bestOddsA.odds) {
            bestOddsA = {bookmaker: bookmaker.key, odds: oddsA};
        }

        if(!bestOddsB || oddsB > bestOddsB.odds) {
            bestOddsB = {bookmaker: bookmaker.key, odds: oddsB};
        }
    });

    if(bestOddsA && bestOddsB) {
        const totalOdds = (1 / bestOddsA.odds) + (1 / bestOddsB.odds);

        if (totalOdds < 1) {
            const margin = (1 - totalOdds) * 100;
            console.log("Arbitrage opportunity found.")
            console.log(`Bet on ${event.teams[0]} with ${bestOddsA.bookmaker} at odds ${bestOddsA.odds}`);
            console.log(`Bet on ${event.teams[1]} with ${bestOddsB.bookmaker} at odds ${bestOddsB.odds}`);
            console.log(`Profit margin: ${margin.toFixed(2)}%`);
        } else {
            console.log("No arbitrage opportunity found.");
        }
    } else {
        console.log("No valid odds found for event")
    }
}
