defaultToExampleInput();
cleanUp();

$("#input").on("change keyup", cleanUp);
$("#replaceWhat, #replaceWithWhat").on("change keyup", cleanUp);
$("#removeClassAttributes").on("change", cleanUp);
$("#removeStyleAttributes").on("change", cleanUp);
$("#removeStyleTag").on("change", cleanUp);
$("#removeEmptySpace").on("change", cleanUp);
$("#file").on("change", onFileChange);

function cleanUp() {
  const inputString = String($("#input").val());
  if (!inputString) {
    $("#output").val("");
    return; // escape early
  }
  const removeClasses = $("#removeClassAttributes").is(":checked");
  const removeStyles = $("#removeStyleAttributes").is(":checked");
  const removeStyleTag = $("#removeStyleTag").is(":checked");
  const removeEmptySpace = $("#removeEmptySpace").is(":checked");
  try {
    const bodyString = inputString.replace(
      /^.*?<body[^>]*?>(.*?)<\/body>.*?$/s,
      "$1"
    );
    const styleTag = inputString
      .replace(/^.*?(<style*?>.*?<\/style>).*?$/s, "$1")
      .replace(/<!--/, "")
      .replace(/-->/, "");
    const html = $(bodyString);
    if (removeStyleTag) html.find("style").remove();
    const replaceWhat = String($("#replaceWhat").val());
    const replaceWithWhat = String($("#replaceWithWhat").val());
    html.find(replaceWhat).replaceWith(function () {
      const attributes = {};
      [...$(this)[0].attributes].forEach((x) => {
        const isClass = removeClasses && x.nodeName === "class";
        const isStyle = removeStyles && x.nodeName === "style";
        const isAllowed = !isClass && !isStyle;
        if (isAllowed) {
          attributes[x.nodeName] = x.nodeValue;
        }
      });
      return $(replaceWithWhat, { html: $(this).html(), ...attributes });
    });

    if (removeStyles) {
      html.find("[style]").removeAttr("style"); // do this last
    }
    if (!removeStyleTag) {
      html.append(styleTag);
    }
    if (removeClasses) {
      html.find("[class]").removeAttr("class"); // do this last
    }
    if (removeEmptySpace) {
      html.find("p").each(function () {
        if ($(this).text().trim().length == 0 && !$(this).children().length) {
          $(this).remove();
        }
      });
    }

    // always remove symbols in <li> since will wrap with <ul> and <ol> next anyways:
    // ul li's if �:
    const ulLiSpans = html.find('li > span:contains("�")');
    const ulLis = ulLiSpans.parents();
    ulLis.each(function () {
      const li = $(this);
      let style = li.attr("style");
      if (style) {
        style = style.replace(/text-indent\:[^;]*;?/, "");
        li.attr("style", style);
      }
      if (!style) {
        li.removeAttr("style");
      }
    });
    ulLiSpans.remove();
    // ol li's if span with a bunch of spaces:
    const sillySpaces = "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"; // = 6x &nbsp;
    const olLiSpans = html.find(`li > span:contains("${sillySpaces}")`);
    const olLis = olLiSpans.parents();
    olLis.each(function () {
      const li = $(this);
      let style = li.attr("style");
      if (style) {
        style = style.replace(/text-indent\:[^;]*;?/, "");
        li.attr("style", style);
      }
      if (!style) {
        li.removeAttr("style");
      }
    });
    olLis.each(function () {
      if (/^\d+\.$/.test(this.childNodes[0].nodeValue)) {
        // remove initial "1." text node:
        this.childNodes[0].remove();
        $(this).css("list-style", "decimal");
      }
    });
    olLiSpans.remove();

    // now END with some string replacements:
    let output = html.html().trim().replace(/\n\n+/g, "\n");
    output = wrapNonNumericLiListWithUl(output);
    output = wrapNumericLiListWithOl(output);
    $("#output").val(output);
  } catch (e) {
    console.log(e);
  }
}

function wrapNonNumericLiListWithUl(str) {
  const orderedListContents = new Set(
    str
      .match(
        /(<li(?! style="list-style: decimal;")[^>]*?>(?!\d+\.)(?!<\/li>).+?<\/li>(\n|$))+/gs
      )
      ?.map((x) => x.replace(/^\s+|\s+$/g, "")) ?? []
  );
  if (orderedListContents) {
    orderedListContents.forEach((match) => {
      str = str.replaceAll(match, `<ul>\n${match}\n</ul>`);
    });
  }
  return str;
}

function wrapNumericLiListWithOl(str) {
  const oldList = str
    .match(/(<li[^>]*?>\d+\.(?!<\/li>).+?<\/li>(\n|$))+/gs)
    ?.map((x) => x.replace(/^\s+|\s+$/g, ""));
  const withStyleInsteadOfNumberText = str
    .match(/(<li style="list-style: decimal;">(?!<\/li>).+?<\/li>(\n|$))+/gs)
    ?.map((x) => x.replace(/^\s+|\s+$/g, ""));

  const orderedListContents = new Set(withStyleInsteadOfNumberText ?? []);

  if (orderedListContents) {
    orderedListContents.forEach((match) => {
      str = str.replaceAll(match, `<ol>\n${match}\n</ol>`);
    });
  }
  return str;
}

function onFileChange(event) {
  const fileList = event.target.files;
  console.log(fileList);
  const file = fileList[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.addEventListener("load", (event) => {
    const fileText = event.target.result;
    $("#input").val(fileText);
    cleanUp();
  });
  reader.addEventListener("progress", (event) => {
    if (event.loaded && event.total) {
      const percent = (event.loaded / event.total) * 100;
      console.log(`Progress: ${Math.round(percent)}`);
    }
  });
}