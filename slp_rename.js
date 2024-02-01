//From https://github.com/mtimkovich/slippi-renamer

const fs = require('fs');
const path = require('path');
const slp = require('slp-parser-js');
const { default: SlippiGame } = require('slp-parser-js');
const argv = require('yargs')
      .usage('Usage $0 [options] <directories>')
      .demandCommand(1, 'You must provide directories to rename.')
      .boolean('n')
      .describe('n', 'perform a trial run without renaming')
      .boolean('r')
      .describe('r', 'rename in subdirectories too')
      .help('h')
      .argv

/** Returns character with their tag or color in parentheses (if they have either). */
function playerName(player, metadata) {
  const character = slp.characters.getCharacterName(player.characterId);
  const color = slp.characters.getCharacterColorName(player.characterId, player.characterColor);
  let playerIds = [];

  if (player.nametag) {
    playerIds.push(player.nametag);
  } else if (color !== 'Default') {
    playerIds.push(color);
  }
  if (metadata && metadata.names.netplay !== 'Player' && metadata.names.netplay !== undefined) {
    playerIds.push(metadata.names.netplay);
  }

  if (playerIds.length > 0) {
    return `${character} (${playerIds.join(',')})`;
  } else {
    return character;
  }
}

function prettyPrintTeams(settings, metadata) {
  const stage = slp.stages.getStageName(settings.stageId);
  const teams = new Map();
  for (let i = 0; i < settings.players.length; i++) {
    let player = settings.players[i];
    if (!teams.has(player.teamId)) {
      teams.set(player.teamId, []);
    }
    if (metadata) {
      teams.get(player.teamId).push(playerName(player, metadata.players[i]));
    } else {
      teams.get(player.teamId).push(playerName(player));
    }
  }

  const pretty = Array.from(teams.values())
                      .map(team => team.join(' & '))
                      .join(' vs ');
  return `${pretty} - ${stage}`;
}

function prettyPrintSingles(settings, metadata) {
  // kind of annoying that some games don't have metadata
  let player1, player2;
  if (metadata) {
    player1 = playerName(settings.players[0], metadata.players[0]);
    player2 = playerName(settings.players[1], metadata.players[1]);
  } else {
    player1 = playerName(settings.players[0]);
    player2 = playerName(settings.players[1]);
  }
  const stage = slp.stages.getStageName(settings.stageId);

  return `${player1} vs ${player2} - ${stage}`;
}

function parsedFilename(settings, metadata, file) {
  const dateRegex = file.match('_([^\.]+)');

  let datePrefix = null;
  if (!dateRegex) {
    if (!metadata) {
      return null;
    }
    const dateStr = metadata.startAt.replace(/[-:]/g, '');
    datePrefix = dateStr.substring(0, dateStr.length - 1);
  } else {
    datePrefix = dateRegex[1];
  }

  let pretty = null;

  if (settings.isTeams) {
    pretty = prettyPrintTeams(settings, metadata);
  } else {
    pretty = prettyPrintSingles(settings, metadata);
  }
  if (!pretty) {
    return null;
  }

  return `${datePrefix} - ${pretty}.slp`
}

function isDirectory(dir) {
  const stats = fs.lstatSync(dir);
  return stats && stats.isDirectory();
}

const directories = argv._;

while (directories.length > 0) {
  const dir = directories.pop();

  if (!isDirectory(dir)) {
    console.log(`${dir} is not a directory, skipping.`);
    continue;
  }

  console.log(`Searching ${dir} for slp files.`);

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (argv.r && isDirectory(filePath)) {
      directories.push(filePath);
      continue;
    } else if (!file.match('\.slp$')) {
      console.log(`'${file}' skipped.`);
      continue;
    }

    const game = new SlippiGame(filePath);
    const settings = game.getSettings();
    const metadata = game.getMetadata();

    const newName = parsedFilename(settings, metadata, file);
    if (!newName) {
      console.log(`Error parsing '${file}'`);
      continue;
    }

    const newPath = path.join(dir, newName);
    if (!argv.n) {
      fs.rename(filePath, newPath, err => {
        if (err) {
          console.log(`Error renaming ${filePath}: ${err}`);
        } else {
          console.log(`Renamed: ${file} -> ${newName}`);
        }
      });
    } else {
      console.log(`${file} -> ${newName}`);
    }
  }
}
