import dayjs from "dayjs";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import fs from "fs";

type Calendar = {
  days: {
    day: string;
    events: string[];
  }[];
};

(async () => {
  const calendar: Calendar = { days: [] };

  const res = await fetch("http://www.supermaruhachi.co.jp/");
  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const linkNodes = document.querySelectorAll<HTMLAnchorElement>("#ai1ec-calendar-view > table tr.ai1ec-week td:not(.ai1ec-empty) a.ai1ec-event-container[href^='http://www.supermaruhachi.co.jp/event/']");
  for (const x of Array.from(linkNodes)) {
    const calendarPage = await fetch(x.href);
    const calendarPageHtml = await calendarPage.text();
    const calendarPageDom = new JSDOM(calendarPageHtml);
    const calendarPageDocument = calendarPageDom.window.document;
    const event = calendarPageDocument.querySelector("h3.title_h3")?.textContent?.trim();
    const durations = calendarPageDocument.querySelector("div.dt-duration")?.textContent?.trim().split(" – ");
    if (!durations) continue;
    if (durations.length === 1) {
      const ymd = durations[0].match(/(\d+)/g);
      if (!ymd) throw Error("ymdが取得できませんでした。");
      const d = dayjs(ymd?.join("-"));
      const formattedDate = d.format("YYYY-MM-DD");
      if (!event) throw Error("eventが取得できませんでした。");
      console.log(event + " - " + formattedDate);
      const idx = calendar.days.findIndex((day) => day.day === formattedDate);
      if (idx !== -1) calendar.days[idx].events.push(event);
      else calendar.days.push({ day: formattedDate, events: [event] });
    } else if (durations.length === 2) {
      const startDate = dayjs(durations[0].match(/(\d+)/g)?.join("-"));
      const endDate = dayjs(durations[1].match(/(\d+)/g)?.join("-"));

      for (let currentDate = startDate.clone(); !currentDate.isAfter(endDate); currentDate = currentDate.add(1, "d")) {
        const formattedDate = currentDate.format("YYYY-MM-DD");
        console.log(event + " - " + formattedDate);
        if (!event) throw Error("eventが取得できませんでした。");
        const idx = calendar.days.findIndex((day) => day.day === formattedDate);
        if (idx !== -1) calendar.days[idx].events.push(event);
        else calendar.days.push({ day: formattedDate, events: [event] });
      }
    }
  }
  console.log({ calendar });
  fs.mkdirSync(`calendar/${dayjs(calendar.days[0].day).format("YYYY")}`, { recursive: true });
  fs.writeFileSync(`calendar/${dayjs(calendar.days[0].day).format("YYYY/MM")}.json`, JSON.stringify(calendar, null, 2));
})();
