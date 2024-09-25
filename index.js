require("dotenv").config();
const express = require("express");
const axios = require("axios");


const app = express();
const port = 3000;

const API_KEY = process.env.API_KEY;

app.get("/odds", async (req, res) => {
    try {
        const response = await axios.get(`https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${API_KEY}&regions=us&markets=h2h,spreads&oddsFormat=decimal`);
        const odds = response.data;

        // console.log(JSON.stringify(odds, null, 2));

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

    let bestOddsH2hA = null;
    let bestOddsH2hB = null;
    let bestOddsSpreadA = null;
    let bestOddsSpreadB = null;


    event.bookmakers.forEach((bookmaker) => {
        // for each bookmaker
        // each bookmaker has a title of the sportsbook and a markets list
        // iterate through their markets
            // each market has a key for the type of bet (ex: h2h, spread) and a list of outcomes
            // for football each outcomes list has two outcomes, objects containing "name" (team name) and "price"
            // compare the price for each team to the bestOdds variable, if greater, replace

        if (!bookmaker.markets || bookmaker.markets.length === 0 || !bookmaker.markets[0].outcomes) {
            console.log(`No valid markets or outcomes for bookmaker ${bookmaker.key}`);
            return;
        }

        // teams does not exist in event object, home_team and away_team
        // iterate though markets
        bookmaker.markets.forEach((market) => {
            if (market.key === "h2h") {
                const oddsH2hA = market.outcomes[0].price;
                const oddsH2hB = market.outcomes[1].price;

                if(!bestOddsH2hA || oddsH2hA > bestOddsH2hA) {
                    bestOddsH2hA = {bookmaker: bookmaker.key, odds: oddsH2hA};
                }

                if(!bestOddsH2hB || oddsH2hB > bestOddsH2hB) {
                    bestOddsH2hB = {bookmaker: bookmaker.key, odds: oddsH2hB};
                }
            }

            if (market.key === "spreads") {
                const oddsSpreadA = market.outcomes[0].price;
                const oddsSpreadB = market.outcomes[1].price;

                if(!bestOddsSpreadA || oddsSpreadA > bestOddsSpreadA) {
                    bestOddsSpreadA = {bookmaker: bookmaker.key, odds: oddsSpreadA};
                }

                if(!bestOddsSpreadB || oddsSpreadB > bestOddsSpreadB) {
                    bestOddsSpreadB = {bookmaker: bookmaker.key, odds: oddsSpreadB};
                }
            }
        });
    });

    if(bestOddsH2hA && bestOddsH2hB) {
        const totalOdds = (1 / bestOddsH2hA.odds) + (1 / bestOddsH2hB.odds);

        if (totalOdds < 1) {
            const margin = (1 - totalOdds) * 100;
            console.log("Arbitrage opportunity found.")
            console.log(`Bet on ${event.teams[0]} with ${bestOddsH2hA.bookmaker} at odds ${bestOddsH2hA.odds}`);
            console.log(`Bet on ${event.teams[1]} with ${bestOddsH2hB.bookmaker} at odds ${bestOddsH2hB.odds}`);
            console.log(`Profit margin: ${margin.toFixed(2)}%`);
        } else {
            console.log("No arbitrage opportunity found.");
        }
    } else {
        console.log("No valid h2h odds found for event")
    }

    if(bestOddsSpreadA && bestOddsSpreadB) {
        const totalOdds = (1 / bestOddsSpreadA.odds) + (1 / bestOddsSpreadB.odds);

        if (totalOdds < 1) {
            const margin = (1 - totalOdds) * 100;
            console.log("Arbitrage opportunity found.")
            console.log(`Bet on ${event.teams[0]} with ${bestOddsSpreadA.bookmaker} at odds ${bestOddsSpreadA.odds}`);
            console.log(`Bet on ${event.teams[1]} with ${bestOddsSpreadB.bookmaker} at odds ${bestOddsSpreadB.odds}`);
            console.log(`Profit margin: ${margin.toFixed(2)}%`);
        } else {
            console.log("No arbitrage opportunity found.");
        }
    } else {
        console.log("No valid h2h odds found for event")
    }
}
