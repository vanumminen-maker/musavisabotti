# Musavisabotti – Käyttöohjeet

Discord-botti musiikkitietovisaan. Botti liittyy äänikanavalle ja soittaa **Spotify-esikatselupätkiä (30s)**. Pelaajat arvaavat artistin ja/tai kappaleen nimen tekstikanavalla.

## 1. Discord Developer Portal

1. Mene osoitteeseen [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klikkaa **New Application** → anna nimi (esim. "Musavisabotti") → Create
3. Vasemmasta valikosta: **Bot** → **Add Bot**
4. **Token**: Klikkaa **Reset Token** → kopioi token → tallenna `.env`-tiedostoon
5. **Privileged Gateway Intents** – laita päälle:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Read Message History`
   - Kopioi URL → liitä selaimeen → kutsu botti serverille

## 2. Spotify Developer Dashboard

Jotta botti voi hakea biisien tiedot, se tarvitsee Spotify-avaimet:
1. Kirjaudu [Spotify Developer Dashboardiin](https://developer.spotify.com/dashboard).
2. Luo uusi appi (**Create App**) ja anna sille nimi.
3. **Redirect URIs**: Laita `http://localhost:8888` (tätä ei käytetä, mutta Spotify vaatii sen).
4. Tallenna ja ota talteen **Client ID** ja **Client Secret**.

---

## Paikallinen kehitys

```bash
# 1. Asenna riippuvuudet
npm install

# 2. Luo .env tiedosto
cp .env.example .env
# Täytä DISCORD_TOKEN ja CLIENT_ID (Application ID Developer Portalista)

# 3. Rekisteröi slash-komennot Discordiin (kerran tai komentojen muuttuessa)
npm run deploy

# 4. Käynnistä botti
npm run start
```

---

## Railway-deployment

1. Pushaa koodi GitHubiin
2. Luo uusi projekti Railwayssa → **Deploy from GitHub repo**
3. Asetukset → **Variables** – lisää:
   - `DISCORD_TOKEN` = botin token
   - `SPOTIFY_CLIENT_ID` = Spotifyn Client ID (Dashboardista)
- `SPOTIFY_CLIENT_SECRET` = Spotifyn Client Secret (Dashboardista)
4. Railway buildaa automaattisesti Dockerfilen avulla

> **Huom:** Slash-komennot pitää rekisteröidä erikseen. Voit tehdä sen paikallisesti ennen deploymenttia tai lisätä `npm run deploy` Railway:n build-komentoon.

---

## Komennot

| Komento | Kuvaus | Oikeus |
|---|---|---|
| `/lisää url` | Lisää biisi, albumi tai soittolista Spotifysta | Manage Messages |
| `/lista` | Näytä biisilista | Manage Messages |
| `/poista numero` | Poista biisi listalta | Manage Messages |
| `/musavisa` | Aloita peli (liittyy vc:lle) | Manage Messages |
| `/stop` | Keskeytä biisi, paljasta vastaus | Manage Messages |
| `/next` | Seuraava biisi | Manage Messages |
| `/lopeta` | Lopeta peli + leaderboard | Manage Messages |
| `/leaderboard` | Pisteet kesken pelin | Kaikki |

---

## Pisteytysjärjestelmä

- Artisti **tai** kappale oikein → **1 piste**
- Artisti **ja** kappale oikein → **2 pistettä**
- Ensimmäinen oikein ⚡ → **+1 bonuspiste**
- Arvaukset tarkistetaan fuzzy-matchingilla (pienet kirjoitusvirheet sallittu)

---

## Pelauksen kulku

1. **Rakenna biisilista ennen peliä:**
   Kopioi linkki Spotifysta (Oikea klikkaus -> Share -> Copy Song/Playlist Link)
   ```
   /lisää url: https://open.spotify.com/track/...
   /lisää url: https://open.spotify.com/playlist/...
   ```
2. **Aloita peli** (liity ensin äänikanavalle!):
   ```
   /musavisa
   ```
3. **Pelaajat arvaavat** kirjoittamalla tekstikanavalle (ei slash-komentoja, ihan normaali viesti):
   ```
   Darude
   Sandstorm
   darude sandstorm
   ```
4. **Seuraava biisi:**
   ```
   /next
   ```
5. **Lopeta ja julkaise tulokset:**
   ```
   /lopeta
   ```

---

## Vianmääritys

**Botti ei soita ääntä:**
- Varmista että olet äänikanavalla ennen `/musavisa`-komennon käyttöä
- Tarkista Railway-lokit: `ffmpeg` pitää olla asennettuna (Dockerfile hoitaa tämän automaattisesti)

**"Virhe biisin lataamisessa" tai "Ei esikatselua":**
- Kaikista Spotify-biiseistä ei ole saatavilla 30s esikatselua (esim. jotkut uutuudet tai alueellisesti rajoitetut). Valitse toinen biisi.
- Varmista, että `SPOTIFY_CLIENT_ID` ja `SECRET` on asetettu oikein.

**Slash-komennot eivät näy:**
- Aja `npm run deploy` kerran paikallisesti tai lisää se build-komentoon
- Discord päivittää globaalit komennot joskus hitaasti (max 1h)
