# VECTOR: Shift — Dizayn Kitabı (Game Design Bible) v1

> Məqsəd: oyunu "bilyard" və ya "mini golf" kimi yox, **hərəkətin (momentin) dili ilə danışan bir dünya** kimi qurmaq.
> Hər dünya = bir sivilizasiyanın / dövrün hərəkəti necə anladığı. Hər mod = o dünyanın bir "qanunu". Hər alt element = o qanunu oynanışa çevirən konkret obyekt.
> Qayda: **hər dünya minimum 25 level**, çətinlik əyrisi: çox asan → asan → asan-orta → orta → orta-çətin → çətin → ekspert.

---

## 1. Hekayə (Story) — "Kinetik Arxiv"

**Əsas fikir:** Bəşəriyyət bilikləri kitablarda yox, **hərəkətdə** saxlayan nəhəng bir maşın qurub — *Kinetik Arxiv*. Hər salonda bir mədəniyyətin hərəkət haqqında kəşfi "donub" qalıb: bucaqlar, sürtünmə, axın, orbit, istilik. Arxiv min il işləməyib, kalibrasiyası pozulub.

**Oyunçu kimdir?** Ağ top — **"Vektor"**. Arxivin son işlək kalibrasiya kürəsi. Hər vuruş bir "cümlədir", hər toqquşma bir "söhbət": impuls bir topdan digərinə keçəndə bilik də ötürülür.

**Böyük metafora:** *Momentin saxlanması = biliyin nəsildən-nəslə ötürülməsi.* Heç bir enerji itmir, sadəcə forma dəyişir — sürtünmə istiliyə, zərbə səsə, səs xatirəyə.

**Dünyalar arası xətt:**
1. Kalibrasiya Tökməxanası — Arxiv oyanır, Vektor ilk "sözlərini" öyrənir (bucaq = bucaq).
2. Hidro Stansiya — Arxivin enerji ürəyi; axın və müqavimət.
3. … hər dünya bir "itmiş qanunu" bərpa edir.
Final: bütün qanunlar birləşir, Arxiv bəşəriyyətin "ilk hərəkətini" (Böyük Partlayışın oxşarı — ilk vuruş, *the break*) yenidən canlandırır. Son level = **bütün dünyaların toplarının bir zəncirvari reaksiya ilə salındığı "Böyük Break"**.

**Hekayə necə verilir (mətn yağdırmadan):**
- Hər dünyanın girişində 2–3 cümləlik "Arxiv qeydi" (terminal üslubunda).
- Gizli **"Xatirə kürələri"**: çətin yerlərdə yerləşən kiçik kristallar; toplayanda o mədəniyyətin real tarixi faktı açılır (məs. "Nəsirəddin Tusi cütlüyü — dairəvi hərəkətdən düz xətt").
- Levelin adı + briefing = hekayə parçası.

---

## 2. İstinad xəritəsi (araşdırma bucaqları)

| Bucaq | Nümunələr | Nə götürürük |
|---|---|---|
| **Puzzle oyunları** | Portal, The Witness, Baba Is You, Monument Valley, Lara Croft GO, Gorogoa, Braid | Bir mexanikanı öyrət → tərsinə çevir → başqası ilə birləşdir; qayda = obyekt |
| **Fizika/top oyunları** | Kirby's Dream Course, Golf Peaks, Desert Golfing, What the Golf?, Mini Golf Battle Royale, Super Monkey Ball, Marble Madness, Peggle | Səth növləri, par ritmi, sürpriz levellər, kursun "hekayəsi" |
| **Stolüstü / ənənəvi oyunlar** | Karrom (Hindistan), Kroquinole (Kanada), Kurlinq (Şotlandiya), Petanq/Boçça, Mankala, Nərd, Paçinko (Yaponiya), Kendama | Hədəfə yaxın dayandırma, dəstə ilə itələmə, düşmə labirinti |
| **Tarixi top oyunları** | Mesoamerika top oyunu *ōllamaliztli* (daş halqa), Çin *cuju*, Azərbaycan **çövkən** (UNESCO irsi), orta əsr kroket/biliard mənşəyi | Halqadan keçirmə, kursun ritual mənası |
| **Elm tarixi** | Galiley maili müstəvisi, Nyuton beşiyi, Fuko rəqqası, Kepler orbitləri, **Nəsirəddin Tusi (Marağa rəsədxanası)**, Uluqbəy, Antikitera mexanizmi | Orbit, rəqqas, dişli, enerji ötürmə |
| **Coğrafiya / mədəniyyət** | İçərişəhər, **Atəşgah** (yanar qaz), Abşeron neft mədənləri (Nobel qardaşları), Qobustan qayaüstü rəsmləri, İpək Yolu karvansarayları, Yapon daş bağları, İslam həndəsi naxışları (girih), Venesiya kanalları, Norveç fyordları | Dünya temaları, vizual dil, maneə formaları |
| **Müasir sistem dizaynı** | Pinball masaları, Rube Goldberg maşınları, Factorio/Opus Magnum (zəncir məntiqi) | Zəncirvari reaksiya, "maşın qurmaq" hissi |

---

## 3. Bütün dünyalar üçün qlobal modlar (oyun rejimləri)

Bu rejimlər istənilən dünyanın levellərinə "qayda paltarı" kimi geyindirilir:

1. **Kurs (Golf)** — par, bir neçə vuruş, böyük xəritə. *Alt elementlər:* par ulduzları, "birdie/eagle" adları, cəza zərbəsi.
2. **Stol (Pool)** — rəngli/nömrəli toplar. *Alt:* rəng uyğunluğu, rotation (sıra), 8-ball (qara sonda), "ehtiyatlı vuruş" (safety), faul.
3. **Zəncir (One-Shot)** — hər şey **bir** vuruşla. *Alt:* Rube Goldberg zəncirləri, domino blokları, ardıcıl açarlar.
4. **Enerji büdcəsi** — bütün level üçün ümumi güc limiti. *Alt:* güc batareyası, enerji toplayan kristallar.
5. **Saat (Time attack)** — vaxt və taymerli maneələr. *Alt:* fırlanan qapılar, ritmik platformalar, metronom.
6. **Kor rejim** — proqnoz xətti yalnız ilk toqquşmaya qədər. *Alt:* "Arxiv səs-küyü", yalnız diamond nişanları ilə nişan.
7. **Güzgü (Mirror)** — level əks çevrilir, idarəetmə də. *Alt:* simmetriya puzzle-ları.
8. **Gündəlik puzzle (Daily)** — hər gün bir prosedural level, dünya üzrə liderlər cədvəli.
9. **Kabus yarışı (Ghost race)** — başqa oyunçunun ən yaxşı oyununun "kabusu" ilə eyni anda (Mini Golf Battle Royale ruhu, amma toqquşmasız).
10. **Hot-seat / 2 oyunçu** — növbəli: bir oyunçu maneə qoyur, digəri həll edir.
11. **Level redaktoru** — oyunçular öz adalarını qurur, `verify` ilə həll olunduğu yoxlanır, paylaşır.

---

## 4. Dünyalar — modlar və alt elementlər

Hər dünya: **tema / hekayə qanunu / 5–10 mod / hər modun alt elementləri / vizual dil / imza level ideyaları.**

### Dünya 1 — Kalibrasiya Tökməxanası (Sənaye inqilabı · Nyuton)
*Qanun:* bucaq = bucaq, impuls ötürülür.
| Mod | Alt elementlər |
|---|---|
| Bank & Bucaq | maili divarlar, diamond nişanları, çoxqat bank, güzgü divar |
| Açarlar & Qapılar | toggle, hold, heavy, **ardıcıl kodlu açarlar** (1-3-2 sırası), taymerli qapı |
| Amerikan stol | künc/yan cib, nömrəli toplar, rotation, 8-ball, rəng cibləri |
| Volfram | ağır top, maqnit lövhə, **kütlə tərəzisi** (iki topun çəkisi bərabər olanda açılır) |
| Mini golf kursu | dirsək, qum, külək, rampa, fırlanan qapı |
| Portal | portal cütləri, **portal cibi** (cibə düşən top başqa yerdən çıxır), sürət saxlanması |
| Halqa (Kroket) | sıralı halqalar, rəngli halqa (yalnız müəyyən top keçə bilər) |
| Konveyer lent | hərəkət edən zolaq, istiqamət dəyişdirici, sürət requlyatoru |
| **Yeni:** Dişli & Rıçaq | top rıçağa dəyəndə körpü fırlanır; dişli çarx qapını yavaş-yavaş açır |

### Dünya 2 — Hidro Stansiya (axın, müqavimət)
| Mod | Alt elementlər |
|---|---|
| Su & batma | gölməçə, dərinlik zonaları (dayaz/dərin), üzən platforma |
| Çay | axın, burulğan (girdab — topu fırladır), şəlalə |
| Deşiklər | açıq deşik, qapağı açılıb-bağlanan deşik |
| Qırılan panel | şüşə, beton, **çatlamış buz** (2-ci keçiddə qırılır) |
| Bumper | yaylı divar, dirək, **turbin** (fırlanan bumper) |
| Kilid & Şlüz | su səviyyəsini qaldıran açar (üzən top yüksəlir), şlüz qapıları |
| **Yeni:** Nasos | su axınının istiqamətini dəyişən klapan |

### Dünya 3 — Karvansaray (İpək Yolu · Şəki, Buxara, Səmərqənd)
*Qanun:* yol, ticarət, işıq — "dəyər ötürülür".
| Mod | Alt elementlər |
|---|---|
| Güzgü salonu | lazer-işıq şüası top yolunu göstərir, güzgüləri top fırladır |
| Bazar | "mal" topları müəyyən tacir ciblərinə daşınmalıdır (rəng = mal) |
| Badgir (külək qülləsi) | qüllələr küləyi aşağı çəkir — istiqamətli külək sütunları |
| Karvan | bir-birinə zəncirlə bağlı top cütləri (biri çəkir, digəri izləyir) |
| Girih naxışı | çoxbucaqlı adalar (5-, 8-, 10-bucaqlı) — İslam həndəsəsi xəritələri |
| Qum fırtınası | dövri külək + görünməz zona |

### Dünya 4 — Daş Halqa (Mesoamerika *ōllamaliztli* · Maya/Aztek)
*Qanun:* top müqəddəsdir; halqadan keçmək — günəşin yolunu təkrar etmək.
| Mod | Alt elementlər |
|---|---|
| Halqa ritualı | divara bərkidilmiş daş halqa (şaquli!), yalnız tullanmaqla keçilir |
| Pilləli piramida | pillələr arasında rampa, yuxarı qalxmaq üçün enerji |
| Təqvim | 260 günlük təqvimə bənzər fırlanan disk — qapılar disk mövqeyinə görə açılır |
| Rezin top | yüksək sıçrayan top növü (restitusiya 0.98) |
| Günəş şüası | gün işığı hərəkət edir — kölgədə qalan açarlar işləmir |

### Dünya 5 — Marağa Rəsədxanası (Nəsirəddin Tusi · Uluqbəy · Kepler)
*Qanun:* cazibə və orbit.
| Mod | Alt elementlər |
|---|---|
| Cazibə quyusu | planet-kürələr topu öz ətrafında fırladır |
| Tusi cütlüyü | iki dairəvi hərəkət düz xətt yaradır — dairəvi relslər |
| Orbit | top orbitə düşür, doğru anda "çıxış" |
| Qara dəlik | yaxınlaşanı udur, çox sürətli olan isə "slingshot" alır |
| Astrolab | fırlanan halqalarla düzəldilən yol |

### Dünya 6 — Atəşgah (Abşeron · yanar qaz · neft)
*Qanun:* istilik = hərəkət (termodinamika).
| Mod | Alt elementlər |
|---|---|
| Alov | yanar zona topu "qızdırır" — isti top sürətlənir, soyuq top yavaşıyır |
| Qalxan isti hava | termik sütunlar topu havaya qaldırır |
| Neft | çox sürüşkən səth (buz kimi), alovla yanır |
| Buxar porşeni | təzyiq yığılınca topu itələyən porşen |
| Nobel boru kəməri | borunun içində top bir adadan digərinə ötürülür |

### Dünya 7 — Daş Bağı (Yaponiya · karesansui · paçinko)
*Qanun:* sükut və düşmə.
| Mod | Alt elementlər |
|---|---|
| Daranmış qum | qum xətləri topu istiqamətləndirir (xətlər boyu asan, xətt keçəndə çətin) |
| Paçinko | mismar sahəsi — top yuxarıdan düşür, düzgün cibi tapmalıdır |
| Bambuk (shishi-odoshi) | dolub boşalan bambuk rıçaq — ritmik itələyici |
| Koi gölü | hərəkət edən canlı maneələr (balıqlar) |
| Sakura | külək + düşən yarpaqlar sürtünməni dəyişir |

### Dünya 8 — Buz Fyordu (Kurlinq · Şimal)
| Mod | Alt elementlər |
|---|---|
| Kurlinq | top hədəf dairəsinin mərkəzində **dayanmalıdır** (xal sistemi) |
| Süpürgə | oyunçu top hərəkətdə ikən qarşısını "süpürür" (sürtünməni azaldır) — aktiv idarə! |
| Çatlamış buz | ikinci keçiddə qırılır |
| Aysberq | sürüşən böyük blok — topla itələnir |

### Dünya 9 — Saat Qülləsi (Antikitera · dişlilər)
| Mod | Alt elementlər |
|---|---|
| Dişli | top dişli çarxa dəyib onu fırladır, çarx körpünü çevirir |
| Rəqqas (Fuko) | yellənən ağır kürə — doğru anı gözlə |
| Nyuton beşiyi | impuls toplar sırası ilə ötürülür (A dəyir, E çıxır) |
| Zaman dondurma | bir düymə ilə 2 saniyəlik yavaşlama (bütün level üçün 1 dəfə) |

### Dünya 10 — Kvant Nüvəsi (final, Arxivin ürəyi)
| Mod | Alt elementlər |
|---|---|
| Superpozisiya | top iki yolla eyni anda gedir, müşahidə (kamera) birini seçir |
| Dolaşıqlıq | iki top: birini vuranda digəri güzgü kimi hərəkət edir |
| Tunel | top müəyyən ehtimalla divardan keçir (deterministik toxum ilə) |
| Böyük Break | bütün dünyaların mexanikaları bir zəncirdə |

---

## 5. Dünya 1 — 25+ level planı

Hazırda 16 level var. Əlavə ediləcək **10 level** (cəmi 26), fərqli ada formaları ilə:

| # | Ad (işlək) | Ada forması | Əsas ideya | Çətinlik |
|---|---|---|---|---|
| 1 | Triangle Bank | üçbucaq | yalnız bank ilə; üç künc cibi | asan |
| 2 | Octagon Rotation | 8-bucaqlı | 8 cib, 1→5 rotation | asan-orta |
| 3 | Eight Ball | düzbucaqlı stol | 8-ball qaydası: qara top ən sonda, əks halda məğlubiyyət | orta |
| 4 | Combination Key | kvadrat | sıralı açarlar (1-3-2 kodu) qapını açır | orta |
| 5 | Portal Pocket | iki stol | **portal cibi**: cibə düşən top o biri stolda çıxır, orada yenidən salınır | orta |
| 6 | Conveyor Yard | U-forma | konveyer lentlər topu daşıyır | orta-çətin |
| 7 | Scale of Tungsten | iki çanaq | kütlə tərəzisi: iki tərəfdə bərabər ağırlıq | orta-çətin |
| 8 | Gear Bridge | dairə + körpü | dişli/rıçaq körpünü fırladır | çətin |
| 9 | Snooker Gauntlet | uzun dəhliz | snooker cibləri + taymerli qapılar + külək | çətin |
| 10 | Foundry Grand Prix | 4 adalı kurs | par 8–10: hər mexanika bir hissədə | ekspert |

**Yeni mexanikalar (Dünya 1 üçün kodlaşdırılacaq):** sıralı kodlu açarlar, 8-ball qaydası, portal cibi, konveyer lent, kütlə tərəzisi, dişli/rıçaq.

---

## 6. Vizual və səs dili (hər dünya üçün)

| Dünya | Rəng palitrası | Material | Səs |
|---|---|---|---|
| Tökməxana | mis + yaşıl mahud + neon mavi | çuqun, qırmızı ağac, pərçim | metal cingilti, buxar |
| Hidro | firuzəyi + tünd göy | beton, kafel, şüşə | su, şəlalə uğultusu |
| Karvansaray | firuzəyi kaşı + qızılı qum | kərpic, kaşı, xalça | sitar/tar motivləri, bazar səsi |
| Daş Halqa | jade yaşıl + oxra | əhəngdaşı, obsidian | nağara, rezin top "tup" |
| Rəsədxana | gecə göyü + latun | latun, mərmər | kamerton, ulduz "zəngi" |
| Atəşgah | narıncı alov + qara neft | daş, metal boru | alov uğultusu |
| Daş Bağı | ağ qum + sakura çəhrayı | qum, bambuk, daş | bambuk "tak", su |
| Buz Fyordu | buz mavisi + ağ | buz, qranit | buz cırıltısı, külək |
| Saat Qülləsi | latun + qırmızı | dişli, şüşə | tıqqıltı, zəng |
| Kvant | bənövşəyi + ağ | işıq, holoqram | sintezator dronu |

---

## 7. Level dizayn qaydaları (bütün dünyalar)
1. **Öyrət → Möhkəmlət → Tərsinə çevir → Birləşdir → Final** (hər dünyada 5 dəfə təkrarlanan dövr).
2. Hər level **bir yeni sual** verməlidir; eyni xəritə forması fərqli problem ilə təkrar oluna bilər.
3. Par = həll alətinin nəticəsi + insan üçün ehtiyat (kiçik stollarda 0–1, kurslarda 1–3).
4. Hər level `npm run verify` ilə həll olunduğu sübut edilir.
5. Top dəstləri qarışmır (Amerikan ↔ Amerikan, Rus ↔ Rus).
6. Hər dünyada ən azı 1 "nəfəs" leveli (sakit, gözəl, asan) və 1 "imza" leveli (dünyanın ruhunu göstərən).
