const measureTTFB = (url: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let startTime = 0;

    xhr.open("GET", url + "?cachebuster=" + Math.random());

    if (xhr.readyState === XMLHttpRequest.OPENED) {
      startTime = performance.now();
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        // time to first byte
        const ttfb = performance.now() - startTime;
        resolve(ttfb);
        xhr.abort(); // We only care about TTFB
      }
    };

    xhr.onerror = () => reject(new Error("XHR request failed"));
    xhr.send();
  });
};

async function measureMultipleTTFB(
  url: string,
  count: number
): Promise<number[]> {
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    times.push(await measureTTFB(url));
  }
  return times;
}

async function getLocation(ip?: string): Promise<{
  country: string;
  city?: string;
  asn: number;
  asnOrganization: string;
  accuracyRadius?: number;
}> {
  if (!ip) {
    const echo = await fetch("https://echo.prax.im");
    if (!echo.ok) throw "Error fetching user's IP address";
    ip = (await echo.json()).ip;
  }
  return (await fetch("https://geoip.prax.im/" + ip)).json();
}

async function testPing() {
  (document.getElementById("rerun")! as HTMLButtonElement).disabled = true;

  const elem = document.getElementById("latency")!;
  elem.classList.add("animate-pulse");
  elem.innerText = "Testing connection...";

  try {
    const location = await getLocation();

    // that's one big mf
    const serverIp = (
      (
        await (
          await fetch(
            "https://cloudflare-dns.com/dns-query?name=ping.prax.im&type=A",
            {
              headers: {
                accept: "application/dns-json",
              },
            }
          )
        ).json()
      ).Answer as any[]
    ).find((v) => v.type == 1).data;

    const pidLocation = await getLocation(serverIp);

    const ping =
      (await measureMultipleTTFB("https://ping.prax.im", 8)).reduce(
        (p, n) => p + n
      ) / 8;

    const color =
      ping < 200
        ? "text-green-400"
        : ping < 400
        ? "text-yellow-400"
        : "text-red-400";

    elem.innerHTML = `You are <span class="${color}">${Math.round(
      ping
    )}</span> ms from the P-ID node (roundtrip latency).<br />
    <span class="text-sm">From ${location.city}, ${location.country} - <i>${
      location.asnOrganization
    } (AS${location.asn})</i> to PID-TARSKI in ${pidLocation.city}, ${
      pidLocation.country
    } - <i>${pidLocation.asnOrganization} (AS${pidLocation.asn})</i></span>`;
  } catch (e) {
    elem.innerHTML = `<span class="text-red-500">Could not connect to PID-TARSKI.</span>`;
    console.error(e);
  }

  elem.classList.remove("animate-pulse");
  (document.getElementById("rerun")! as HTMLButtonElement).disabled = false;
}

testPing();

document.getElementById("rerun")!.addEventListener("click", testPing);

// Set up the sparkling as well

const medium = ":;abcdefghijklmnopqrstuvwxyz<>".split("");
const small = ",.'-".split("");

function random(end: number) {
  return Math.floor(Math.random() * end);
}

function setCharAt(str: string, index: number, chr: string) {
  if (index < 0 || index >= str.length) return str;
  return str.slice(0, index) + chr + str.slice(index + 1);
}

function replaceRandom(
  input: string,
  charsToReplace: string[],
  charsToReplaceWith: string[]
): string {
  const positions = input
    .split("")
    .map((char, idx) => (charsToReplace.includes(char) ? idx : -1))
    .filter((idx) => idx !== -1);

  input = setCharAt(
    input,
    positions[random(positions.length)],
    charsToReplaceWith[random(charsToReplaceWith.length)]
  );
  return input;
}

setTimeout(() => {
  setInterval(() => {
    const elem = document.getElementById("logo")!;

    elem.innerText = replaceRandom(elem.innerText, medium, medium);
  }, 100);

  for (let i = 0; i < 10; i++) {
    setInterval(() => {
      const elem = document.getElementById("logo")!;

      elem.innerText = replaceRandom(elem.innerText, small, small);
    }, 80 + i);
  }
}, 10_000);
