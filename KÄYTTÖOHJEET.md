# Musavisabotti – Käyttöohjeet

Discord-botti musiikkiin ja visailuun. Botti tukee kahta tilaa: **Musavisa** (kilpailu) ja **Musiikin kuuntelu** (normaali soitto).

---

## 🎮 Osa 1: Musavisa (Musiikkitietovisa)

Tässä tilassa botti soittaa 30 sekunnin pätkiä biiseistä, ja pelaajat arvaavat artistin ja kappaleen nimen.

### Visan valmistelu
1. Etsi SoundCloudista biisejä tai soittolistoja.
2. Käytä `/lisää url: [linkki]` lisätäksesi ne visalistaan.
3. `/lista` näyttää kaikki lisätyt biisit.
4. `/poista numero` poistaa tietyn biisin listalta.

### Visan pelaaminen
1. Liity ensin äänikanavalle.
2. Käytä `/musavisa` aloittaaksesi pelin.
3. Botti soittaa biisin. Kirjoita arvaus tekstikanavalle.
4. `/next` siirtyy seuraavaan biisiin.
5. `/stop` paljastaa vastauksen heti.
6. `/lopeta` päättää pelin ja julkaisee lopulliset pisteet.

**Pisteytys:**
- 2p: Artisti ja kappale molemmat oikein.
- 1p: Toinen niistä oikein.
- +1p ⚡: Nopeusbonus ensimmäiselle oikein arvaajalle.

---

## 🎧 Osa 2: Musiikin kuuntelu (Normal mode)

Tässä tilassa voit kuunnella musiikkia koko pituudeltaan ja hallita yhteistä jonoa.

### Käyttö
1. `/liity`: Kutsu botti kanavalle ja vaihda musiikkitilaan.
2. `/jono url: [linkki]`: Lisää biisi tai soittolista yhteiseen jonoon.
3. `/pause` / `/play`: Pysäytä ja jatka musiikkia.
4. `/skip`: Hyppää seuraavaan biisiin jonossa.
5. `/skip kohde: jono`: Tyhjennä koko jono kerralla.
6. `/poistu`: Botti poistuu kanavalta ja nollaa kaikki tilat.

---

## 🛠️ Tekninen asennus (Ylläpitäjä)

1. Lisää `DISCORD_TOKEN` ja `CLIENT_ID` (Application ID) Railwayn muuttujiin.
2. Pushaa koodi GitHubiin.
3. Muista ajaa `npm run deploy` kerran uusien komentojen rekisteröimiseksi.

---

Nauti musiikista ja onnea kisaan! 🎶🦾✨
