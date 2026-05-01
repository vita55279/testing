let Data = {
  numberStats: {},
  cooccurrence: {}
};

// Initialize 1~49
for (let i = 1; i <= 49; i++) {
  Data.numberStats[i] = { appearances: 0, mainNumber: 0, lastSeen: "1970-01-01" };
  Data.cooccurrence[i] = {};
  for (let j = 1; j <= 49; j++) {
    Data.cooccurrence[i][j] = 0;
  }
}

let totalDraws = 0;

// Load CSV data
d3.csv("Mark_Six.csv").then(data => {
  totalDraws = data.length;
  document.getElementById("totalDraws").textContent = totalDraws;

  data.forEach(draw => {
    let mainNums = [
      +draw['Winning Number 1'],
      +draw['2'],
      +draw['3'],
      +draw['4'],
      +draw['5'],
      +draw['6']
    ];
    let extraNum = +draw['Extra Number'] || 0;
    let currentDate = draw.Date;

    // Main number statistics
    mainNums.forEach(n => {
      Data.numberStats[n].mainNumber++;
      Data.numberStats[n].appearances++;
      if (currentDate > Data.numberStats[n].lastSeen) {
        Data.numberStats[n].lastSeen = currentDate;
      }
    });

    // extra number statistics
    if (extraNum >= 1 && extraNum <= 49) {
      Data.numberStats[extraNum].appearances++;
      if (currentDate > Data.numberStats[extraNum].lastSeen) {
        Data.numberStats[extraNum].lastSeen = currentDate;
      }
    }

    // Co-occurrence
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        let a = mainNums[i];
        let b = mainNums[j];
        Data.cooccurrence[a][b]++;
        Data.cooccurrence[b][a]++;
      }
    }
  });
});

// Co-occurring color configuration (low white, high red)
let colorScale;

function updateColorScale(maxCount) {
  colorScale = d3.scaleQuantize()
    .domain([0, maxCount])
    .range(["#ffffff", "#ffcccc", "#ff9999", "#ff6666", "#ff0000"]);
}

let selectedNumbers = new Set();
const maxSelections = 6;
const redNumbers = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
const blueNumbers = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
const greenNumbers = [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49];

// Number ball color
//function getMarkSixColor(num) {
//if (redNumbers.includes(num)) return "#ff3131";
//if (blueNumbers.includes(num)) return "#0070ff";
//if (greenNumbers.includes(num)) return "#28a745";
//}
function getMarkSixColor(num) {
    const red = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
    const blue = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
    const green = [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49];
    if (red.includes(num)) return "#ff3131";
    if (blue.includes(num)) return "#0070ff";
    return "#28a745";
}


// Generate Numbered Balls (Preserving Image Style) 
const grid = document.getElementById("number-grid");
for (let i = 1; i <= 49; i++) {
  const ball = document.createElement('div');
  ball.className = 'num-ball';
  ball.style.borderColor = getMarkSixColor(i);

  const img = document.createElement('div');
  img.className = 'ball-img';
  img.style.backgroundImage = `url('images/ball-${i}.svg')`;

  const text = document.createElement('span');
  text.className = 'num-text';
  text.innerText = i;

  ball.appendChild(img);
  ball.appendChild(text);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("ball-ring");
  svg.setAttribute("viewBox", "0 0 100 100");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "50");
  circle.setAttribute("cy", "50");
  circle.setAttribute("r", "47");
  circle.setAttribute("stroke", getMarkSixColor(i));
  circle.setAttribute("stroke-dasharray", "295 295");

  svg.appendChild(circle);
  ball.prepend(svg);

  ball.onmouseenter = () => {
    if (!ball.classList.contains('selected')) {
      text.style.color = getMarkSixColor(i);
    }
  };

  ball.onmouseleave = () => {
    if (!ball.classList.contains('selected')) {
      text.style.color = '';
    }
  };

  // Click to select
  ball.onclick = async () => {
    const num = i;
    const isSelected = ball.classList.contains('selected');

    if (isSelected) {
      selectedNumbers.delete(num);
      ball.classList.remove('selected');
      text.style.display = 'flex';
    } else {
      if (selectedNumbers.size >= maxSelections) {
        alert("You can only choose a maximum of 6 numbers!");
        return;
      }
      selectedNumbers.add(num);
      ball.classList.add('selected');
      text.style.display = 'none';
    }

    // Refresh co-occurrence colors + statistics
    await updateNumberVisualization();
    updateAllStats();
  };

  grid.appendChild(ball);
}

// Probability is represented by the completeness of the outer ring of the sphere.
async function updateNumberVisualization() {
  const selectedArr = Array.from(selectedNumbers);
  const circumference = 295; // Total length of the circle

  // No number selected then restore all circles
  if (selectedArr.length === 0) {
    document.querySelectorAll('.num-ball').forEach(ball => {
      const circle = ball.querySelector('circle');
      circle.style.display = "block";
      circle.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
      ball.style.opacity = "1";
      ball.style.backgroundColor = "transparent";
    });
    return;
  }

  let scoreMap = {};
  let allScores = [];

  // Calculate the score for each number.
  for (let ball of document.querySelectorAll('.num-ball')) {
    const num = parseInt(ball.querySelector('.num-text').innerText);
    if (selectedNumbers.has(num)) continue;

    let score = 0;
    if (selectedArr.length === 1) {
      const s = selectedArr[0];
      score = Data.cooccurrence[s][num];
    } else {
      const testCombo = [...selectedArr, num].sort((a, b) => a - b);
      score = await countComboAppearance(testCombo);
    }

    scoreMap[num] = score;
    allScores.push(score);
  }

  const maxScore = Math.max(...allScores, 1);

  // Updating circle length
  document.querySelectorAll('.num-ball').forEach(ball => {
    const num = parseInt(ball.querySelector('.num-text').innerText);
    const circle = ball.querySelector('circle');
    const color = getMarkSixColor(num);

    // Selected ball: Hidden outer ring, solid color
    if (selectedNumbers.has(num)) {
      circle.style.display = "none";
      ball.style.opacity = "1";
      ball.style.backgroundColor = "transparent";
      return;
    }

    // Unselected ball: Variations in both outer ring length and transparency
    circle.style.display = "block";
    const score = scoreMap[num] || 0;
    const percent = score / maxScore;

    // Outer ring length
    const visibleLength = percent * circumference;
    circle.setAttribute("stroke-dasharray", `${visibleLength} ${circumference}`);
    circle.setAttribute("stroke", color);

    // Fading transparency: Minimum 0.2 ~ Maximum 1
    const opacity = 0.2 + (percent * 0.8);
    ball.style.opacity = opacity;

    ball.style.backgroundColor = "transparent";
  });
}

// Dynamically updated legend
function updateLegend() {
  const legend = document.getElementById("dynamicLegend");
  if(!legend) return;
  legend.innerHTML = "";

  const range = colorScale.range();
  // Calculate the segmented threshold of scaleQuantize
  const thresholds = colorScale.thresholds();

  // Generate tags for each segment
  range.forEach((color, i) => {
    let start, end;
    if (i === 0) {
      start = colorScale.domain()[0];
      end = thresholds[0];
    } else if (i === range.length - 1) {
      start = thresholds[thresholds.length - 1];
      end = colorScale.domain()[1];
    } else {
      start = thresholds[i - 1];
      end = thresholds[i];
    }

    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-color" style="background-color: ${color}; ${color === '#ffffff' ? 'border:1px solid #ddd;' : ''}"></span>
      <span class="legend-text">${start}-${end} ${i === 0 ? '(Low)' : i === range.length-1 ? '(High)' : ''}</span>
    `;
    legend.appendChild(item);
  });
}

// Number of times the combination appears
function countComboAppearance(combo) {
  return new Promise(resolve => {
    d3.csv("Mark_Six.csv").then(draws => {
      let count = 0;
      draws.forEach(draw => {
        const nums = [
          +draw['Winning Number 1'],
          +draw['2'],
          +draw['3'],
          +draw['4'],
          +draw['5'],
          +draw['6']
        ];
        const containsAll = combo.every(n => nums.includes(n));
        if (containsAll) count++;
      });
      resolve(count);
    });
  });
}
window.onload = function() {
  document.querySelector('.nav-btn.active').click();
}

// Statistical Area Update 
async function updateAllStats() {
  const container = document.getElementById("statsContainer");
  const emptyState = document.getElementById("emptyState");
  const rightPanel = document.querySelector(".sidebar-right");
  
  if (selectedNumbers.size === 0) {
    container.style.display = "none";
    emptyState.style.display = "block";
    rightPanel.classList.remove("active");
    return;
  }
  
  container.style.display = "block";
  emptyState.style.display = "none";
  rightPanel.classList.add("active");

  const sorted = Array.from(selectedNumbers).sort((a, b) => a - b);
  d3.select("#statsIcons").html("");

  sorted.forEach(n => {
    d3.select("#statsIcons")
      .append("div")
      .attr("class", "stats-icon")
      .style("background-color", "transparent")
      .style("background-image", `url('images/ball-${n}.svg')`)
      .style("background-size", "cover")
      .style("background-position", "center")
      .style("width", "80px")
      .style("height", "80px")
      .style("border-radius", "50%")
      .style("margin-right", "4px")
      .text("");
  });

  d3.select("#selectedNumbersText").text(sorted.join(", "));

  if (selectedNumbers.size === 1) {
    updateStatsCard(sorted[0]);
  } else {
    await getCombinationStats(sorted);
  }

  await renderCompanionChart(sorted);
}

// Single number statistics
function updateStatsCard(num) {
  const stats = Data.numberStats[num];
  d3.select("#appearances").text(stats.appearances);
  d3.select("#frequency").text(((stats.appearances / totalDraws) * 100).toFixed(2) + "%");
  d3.select("#mainNumber").text(stats.mainNumber);
  d3.select("#lastSeen").text(stats.lastSeen);
}

// Combinatorial statistics
async function getCombinationStats(sortedNumbers) {
  const draws = await d3.csv("Mark_Six.csv");
    let comboCount = 0;
    let mainComboCount = 0;
    let lastDrawDate = "N/A";

    draws.forEach(draw => {
      const main = [
        +draw['Winning Number 1'], 
        +draw['2'], 
        +draw['3'],
        +draw['4'], 
        +draw['5'], 
        +draw['6']
      ];
      const extra = +draw['Extra Number'] || 0;
      const all = [...main, extra];
      const date = draw.Date;

      const inAll = sortedNumbers.every(n => all.includes(n));
      if (inAll) {
        comboCount++;
        if (lastDrawDate === "N/A" || date > lastDrawDate) {
          lastDrawDate = date;
        }
      }

      const inMain = sortedNumbers.every(n => main.includes(n));
      if (inMain) mainComboCount++;
    });

    d3.select("#appearances").text(comboCount);
    d3.select("#frequency").text(((comboCount / draws.length) * 100).toFixed(2) + "%");
    d3.select("#mainNumber").text(mainComboCount);
    d3.select("#lastSeen").text(lastDrawDate);
}


// Co-occurrence bar chart
async function renderCompanionChart(selectedList) {
  const chartWrapper = document.getElementById("chartWrapper");
  const chartContainer = document.getElementById("companionChart");

  chartWrapper.style.display = "block";
  chartContainer.innerHTML = "";

  // Load data
  const draws = await d3.csv("Mark_Six.csv");

  const result = [];

  // For each unselected number n
  for (let n = 1; n <= 49; n++) {
    if (selectedList.includes(n)) continue;

    // Combination = All numbers you selected + n
    const combo = [...selectedList, n].sort((a, b) => a - b);

    // Calculate how many times this set of numbers actually appeared together
    let count = 0;
    for (const draw of draws) {
      const nums = [
        +draw['Winning Number 1'],
        +draw['2'],
        +draw['3'],
        +draw['4'],
        +draw['5'],
        +draw['6']
      ];

      // Check that every single one in the combo is in the winning numbers.
      const allIn = combo.every(x => nums.includes(x));
      if (allIn) count++;
    }

    result.push({ number: n, count: count });
  }

  // Take the top 10 with the most occurrences
  const top10 = result
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Drawing chart
  const margin = { top: 15, right: 20, bottom: 45, left: 40 };
  const width = chartContainer.clientWidth - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  const svg = d3.select(chartContainer)
    .append("div")
    .style("position", "relative")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select("body").append("div")
    .attr("class", "chart-tooltip")
    .style("position", "fixed")
    .style("background", "#ffffff")
    .style("border", "1px solid #9333ea")
    .style("border-radius", "8px")
    .style("padding", "10px 14px")
    .style("box-shadow", "0 3px 10px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("z-index", "9999")
    .style("opacity", 0)
    .style("font-size", "14px");

  const x = d3.scaleBand()
    .domain(top10.map(d => d.number))
    .range([0, width - margin.left - margin.right])
    .padding(0.2);

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  const maxY = d3.max(top10, d => d.count) || 1;

  const y = d3.scaleLinear()
    .domain([0, maxY])
    .range([height, 0]);

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(top10)
    .enter()
    .append("rect")
    .attr("fill", "#9333ea")
    .attr("x", d => x(d.number))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.count))

    // Mouse hover
    .on("mouseover", function(e, d) {
      d3.select(this).attr("fill", "#c084fc");
        
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Number ${d.number}</strong><br/>
          Co-occurrence: ${d.count} times
        `)
        .style("left", (e.clientX + 15) + "px")
        .style("top", (e.clientY - 28) + "px");
    })
      
    // Mouse leave
    .on("mouseout", function() {
      d3.select(this).attr("fill", "#9333ea");
      tooltip.style("opacity", 0);
    });

  // X-axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#4a5568")
    .text("Companion Number");

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 15)
    .attr("x", -height / 2)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#4a5568")
    .text("Co-occurrence Count");
}

const resetBtn = document.getElementById("resetBtn");
resetBtn.addEventListener("click", async () => {
  // Clear selected numbers
  selectedNumbers.clear();

  // Restore all balls to an unselected state.
  document.querySelectorAll(".num-ball").forEach(ball => {
    ball.classList.remove("selected");
    ball.querySelector(".num-text").style.display = "flex";
    ball.style.backgroundColor = ""; // Clear heatmap colors
  });

  await updateNumberVisualization();
  updateAllStats();
});

// Download CSV file
document.getElementById('downloadBtn').addEventListener('click', () => {
  // File path
  const fileUrl = 'Mark_Six.csv';
  const fileName = 'Mark_Six.csv';

  // Create a temporary <a> tag to automatically click and download.
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  link.click();
});

// Welcome Pop-up control
const welcomeOverlay = document.getElementById("welcomeOverlay");
const closeWelcome = document.getElementById("closeWelcome");
const startExploreBtn = document.getElementById("startExploreBtn");
const openMoreDetails = document.getElementById("openMoreDetails");

// More Detail Pop-up control
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const infoBtn = document.getElementById("infoBtn");
const welcomeBtn = document.getElementById("welcomeBtn");

function openWelcomePopup() {
  welcomeOverlay.style.display = "flex";
}
function closeWelcomePopup() {
  welcomeOverlay.style.display = "none";
}

function openDetailPopup() {
  modalOverlay.style.display = "flex";
}
function closeDetailPopup() {
  modalOverlay.style.display = "none";
}

// Welcome pop-up button
closeWelcome.addEventListener("click", closeWelcomePopup);
startExploreBtn.addEventListener("click", closeWelcomePopup);
welcomeBtn.addEventListener("click", openWelcomePopup);

// More Details pop-up button
closeModal.addEventListener("click", closeDetailPopup);
infoBtn.addEventListener("click", openDetailPopup);

// More Details Link: Close Welcome and Open Details
openMoreDetails.addEventListener("click", (e) => {
  e.preventDefault();
  closeWelcomePopup();
  openDetailPopup();
});

//"Back to Welcome" button
const backToWelcomeBtn = document.getElementById("backToWelcome");
backToWelcomeBtn.addEventListener("click", () => {
  closeDetailPopup();
  openWelcomePopup();
});

// Can also click the background icon to close the pop-up
welcomeOverlay.addEventListener("click", (e) => {
  if (e.target === welcomeOverlay) closeWelcomePopup();
});
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeDetailPopup();
});

// Automatically pop-up Welcome message when entering website
window.addEventListener('load', function() {
  welcomeOverlay.style.display = "flex";
  updateAllStats(); 
});

// ========== Left navigation buttons + page switching ==========
const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

const pageIds = [
  "page-pick",
  "page-frequency",
  "page-hotcold",
  "page-cooccur",
  "page-random",
  "page-colour",
  "page-distribution",
  "page-prize",
  "page-trend"
];

const rightPanel = document.querySelector(".sidebar-right");
const panelStats = document.getElementById("panel-stats");
const panelFreq = document.getElementById("panel-frequency");
const panelCooccur = document.getElementById("panel-cooccur");
const panelColour = document.getElementById("panel-colour");
const panelDistri = document.getElementById("panel-distribution");

navBtns.forEach((btn, idx) => {
  btn.addEventListener("click", () => {
    // Button Style switching
    navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Pages switching
    pages.forEach(p => p.classList.remove("active-page"));
    document.getElementById(pageIds[idx]).classList.add("active-page");

    // Smart switching on the right panel
    if (pageIds[idx] === "page-pick") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = ""; 
      panelStats.style.display = "block";
      panelFreq.style.display = "none";
      panelCooccur.style.display = "none";
      panelColour.style.display = "none";
      panelDistri.style.display = "none";
    }
    else if (pageIds[idx] === "page-frequency") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#ffe6e6";
      panelStats.style.display = "none";
      panelFreq.style.display = "block";
      panelCooccur.style.display = "none";
      panelColour.style.display = "none";
      panelDistri.style.display = "none";
      
      resetAllBalls();
      startFrequencyPage();
    }
    else if (pageIds[idx] === "page-hotcold") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");

      resetAllBalls();
      startHotColdPage();
    }
    else if (pageIds[idx] === "page-cooccur") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#e6f0ff";
      panelStats.style.display = "none"; 
      panelFreq.style.display = "none";
      panelCooccur.style.display = "block";
      panelColour.style.display = "none";
      panelDistri.style.display = "none";
  
      resetAllBalls();
      startCooccurPage();
    }
    else if (pageIds[idx] === "page-random") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");
  
      resetAllBalls();
      startRandomnessPage();
    }
    else if (pageIds[idx] === "page-colour") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#ffe6e6"; 
      panelStats.style.display = "none";
      panelFreq.style.display = "none";
      panelCooccur.style.display = "none";
      panelColour.style.display = "block";
      panelDistri.style.display = "none";
  
      resetAllBalls();
      startColourPage();
    }
    else if (pageIds[idx] === "page-distribution") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#ffe6e6";
      panelStats.style.display = "none";
      panelFreq.style.display = "none";
      panelCooccur.style.display = "none";
      panelColour.style.display = "none";
      panelDistri.style.display = "block";
  
      resetAllBalls();
      startWeekdayHeatmap();
    }
    else if (pageIds[idx] === "page-prize") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");
    
      resetAllBalls();
      startPrizeChart();
    }
    else if (pageIds[idx] === "page-trend") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");
    
      resetAllBalls();
      startFutureTrend();
    }
    else {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");

      resetAllBalls();
    }
  });
});

function resetAllBalls() {
  selectedNumbers.clear();

  document.querySelectorAll(".num-ball").forEach(ball => {
    ball.classList.remove("selected");
    const text = ball.querySelector(".num-text");
    if (text) text.style.display = "flex";

    ball.style.opacity = "1";
    ball.style.backgroundColor = "transparent";

    const circle = ball.querySelector("circle");
    if (circle) {
      circle.style.display = "block";
      circle.setAttribute("stroke-dasharray", "295 295");
    }
  });

  updateAllStats();
}

// ==============================
// Page 2: Frequency
// ==============================
let freqData = {};
let freqPositionData = [];
let excludeExtra = false; 
let currentFreqMode = "sort";

// Fixed layout parameters
const freqRows = 7;
const freqCols = 7;
const freqSpacing = 83.15;
const offsetX = -26;
const offsetY = 20;

// Generate coordinates 1–49
function generateFreqPositionData() {
  let arr = [];
  for (let i = 0; i < freqRows; i++) {
    for (let j = 0; j < freqCols; j++) {
      const n = i * freqCols + j + 1;
      arr.push({
        n: n,
        x: j * freqSpacing + offsetX,
        y: i * freqSpacing + offsetY
      });
    }
  }
  freqPositionData = arr;
}

// Create a dedicated DIV ball for Page 2
function generateFreqDivBalls() {
  const wrap = d3.select("#freq-ball-wrap");
  wrap.selectAll(".num-ball").remove();
  generateFreqPositionData();

  const tooltip = d3.select("body").append("div")
    .attr("class", "page2-freq-tooltip");

  const balls = wrap.selectAll(".num-ball")
    .data(freqPositionData, d => d.n)
    .enter()
    .append("div")
    .attr("class", "num-ball")
    .style("left", d => d.x + "px")
    .style("top", d => d.y + "px");

  balls.append("div")
    .attr("class", "ball-img")
    .style("background-image", d => `url('images/ball-${d.n}.svg')`);

  balls.append("span")
    .attr("class", "num-text")
    .text(d => d.n);

  balls.each(function(d) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("ball-ring");
    svg.setAttribute("viewBox", "0 0 100 100");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "50");
    c.setAttribute("cy", "50");
    c.setAttribute("r", "47");
    c.setAttribute("stroke", getMarkSixColor(d.n));
    c.setAttribute("stroke-dasharray", "295 295");
    svg.appendChild(c);
    this.prepend(svg);
  });

  // Ball hover function
  balls.on("mouseenter", function(e, d) {
    const text = d3.select(this).select(".num-text");
    if (!d3.select(this).classed("selected")) {
      text.style("color", getMarkSixColor(d.n));
    }

    tooltip
      .style("opacity", 1)
      .html(`
        Number：${d.n}<br/>
        Appearances：${freqData[d.n] || 0} times
      `)
      .style("left", (e.pageX + 10) + "px")
      .style("top", (e.pageY - 40) + "px");
  })
  .on("mousemove", function(e) {
    tooltip
      .style("left", (e.pageX + 10) + "px")
      .style("top", (e.pageY - 40) + "px");
  })
  .on("mouseleave", function() {
    const text = d3.select(this).select(".num-text");
    if (!d3.select(this).classed("selected")) {
      text.style("color", "");
    }
    tooltip.style("opacity", 0);
  });
}

// Load frequency
async function loadFrequencyData() {
  const data = await d3.csv("Mark_Six.csv");
  freqData = {};

  data.forEach(draw => {
    const mainNumbers = [
      +draw['Winning Number 1'],
      +draw['2'],
      +draw['3'],
      +draw['4'],
      +draw['5'],
      +draw['6']
    ];

    const extraNum = +draw['Extra Number'];

    // First, count the winning numbers (forever).
    mainNumbers.forEach(n => {
      if (n >= 1 && n <= 49) { 
        freqData[n] = (freqData[n] || 0) + 1;
      }
    });

    // Only add extra number if "not excluding extra".
    if(!excludeExtra){
      if (extraNum >= 1 && extraNum <= 49) {
        freqData[extraNum] = (freqData[extraNum] || 0) + 1;
      }
    }
  });
}

// Execute when entering Page 2
async function startFrequencyPage() {
  generateFreqPositionData();
  generateFreqDivBalls();
  await loadFrequencyData();

  sortByFreq();
  setFreqButtonActive("sort");
}

// Include Extra Number Checkbox
const chkIncludeExtra = document.getElementById("chkIncludeExtra");
const statusLabel = document.getElementById("freqStatusLabel");

// Initialization: Default selection = Includes Extra Number
chkIncludeExtra.checked = true;
excludeExtra = false;

chkIncludeExtra.addEventListener("change", async function() {
  excludeExtra = !this.checked;

  if (excludeExtra) {
    statusLabel.textContent = "Current status: Excludes Extra numbers";
    statusLabel.className = "freq-status-label status-exclude";
  } else {
    statusLabel.textContent = "Current status: Includes Extra numbers";
    statusLabel.className = "freq-status-label status-include";
  }

  await loadFrequencyData();
  sortByFreq();
  setFreqButtonActive("sort");
});

// Sort By Frequency function
function sortByFreq() {
  const minCount = d3.min(Object.values(freqData));
  const maxCount = d3.max(Object.values(freqData));
  const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([20, 75]);

  const sortedNums = Object.keys(freqData).map(Number).sort((a, b) => freqData[b] - freqData[a]);

  const newPosition = sortedNums.map((n, i) => ({
    n: n,
    x: freqPositionData[i].x,
    y: freqPositionData[i].y
  }));

  d3.select("#freq-ball-wrap")
    .selectAll(".num-ball")
    .data(newPosition, d => d.n)
    .transition()
    .duration(1000)
    .delay((d, i) => i * 50)
    .style("left", d => d.x - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("top", d => d.y - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("width", d => sizeScale(freqData[d.n]) + "px")
    .style("height", d => sizeScale(freqData[d.n]) + "px")
    .on("start", function() {
      d3.select(this).classed("selected", true);
      d3.select(this).select(".num-text").style("display", "none");
      d3.select(this).select(".ball-img").style("opacity", "1");
    });
}

// Size By Frequency function
function sizeByFreq() {
  const minCount = d3.min(Object.values(freqData));
  const maxCount = d3.max(Object.values(freqData));
  const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([20, 75]);

  d3.select("#freq-ball-wrap")
    .selectAll(".num-ball")
    .data(freqPositionData, d => d.n)
    .transition()
    .duration(500)
    .delay((d, i) => i * 50)
    .style("left", d => d.x - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("top", d => d.y - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("width", d => sizeScale(freqData[d.n]) + "px")
    .style("height", d => sizeScale(freqData[d.n]) + "px")
    .on("start", function() {
      d3.select(this).classed("selected", true);
      d3.select(this).select(".num-text").style("display", "none");
      d3.select(this).select(".ball-img").style("opacity", "1");
    });
}

// Reset function
function resetFreqBalls() {
  d3.select("#freq-ball-wrap")
    .selectAll(".num-ball")
    .data(freqPositionData, d => d.n)
    .transition()
    .duration(500)
    .delay((d, i) => i * 10)
    .style("left", d => d.x + "px")
    .style("top", d => d.y + "px")
    .style("width", "70px")
    .style("height", "70px")
    .on("end", function() {
      d3.select(this).select(".num-text").style("display", "flex");
      d3.select(this).select(".ball-img").style("opacity", "0");
      d3.select(this).classed("selected", false);
    });
}

function setFreqButtonActive(mode) {
  d3.selectAll(".freq-btn").classed("active-dark", false);
  currentFreqMode = mode;

  if(mode === "sort"){
      d3.select("#btnSortFreq").classed("active-dark", true);
  }else if(mode === "size"){
      d3.select("#btnSizeFreq").classed("active-dark", true);
  }else if(mode === "reset"){
      d3.select("#btnResetFreq").classed("active-dark", true);
  }
}

document.getElementById("btnSortFreq").onclick = function() {
  sortByFreq();
  setFreqButtonActive("sort");
};
document.getElementById("btnSizeFreq").onclick = function() {
  sizeByFreq();
  setFreqButtonActive("size");
};
document.getElementById("btnResetFreq").onclick = function() {
  resetFreqBalls();
  setFreqButtonActive("reset");
};

// ==============================
// Page 3: Hot & Cold
// ==============================
let includeExtraPage3 = true;

// Binding checkbox (with animation)
document.addEventListener('DOMContentLoaded', () => {
  const check = document.getElementById('includeExtraPage3');
  check.checked = true;

  check.addEventListener('change', async () => {
    includeExtraPage3 = check.checked;

    await fadeOutHotCold();
    startHotColdPage();
  });
});

// Fade-out animation function
function fadeOutHotCold() {
  return new Promise(resolve => {
    d3.selectAll(".hc-item")
      .classed("hc-item-fade-out", true);
    setTimeout(resolve, 280);
  });
}

async function startHotColdPage() {
    await loadFrequencyData();
  
    const freqArray = Object.entries(freqData)
      .map(([n, count]) => ({ n: +n, count }));
  
    const sortedHot = [...freqArray].sort((a, b) => b.count - a.count).slice(0, 10);
    const sortedCold = [...freqArray].sort((a, b) => a.count - b.count).slice(0, 10);
  
    const maxCount = d3.max(freqArray, d => d.count);

    // Hot list
    const hotList = d3.select("#hot-list");
    hotList.html("");

	const htable = hotList.append("table");
	const htbody = htable.append("tbody");
	sortedHot.forEach((item, i) => {
		const row = htbody.append("tr");
		row.append("td").text(`#${i + 1}`);
		const ballCell = row.append("td");
		const svgWrap = ballCell.append("div").attr("class", "hc-ball-svg");
		if (i < 3) {
			svgWrap.append("img")
				.attr("src", `images/ball-${item.n}.svg`)
				.attr("alt", item.n)
				.attr("width", "100%")
				.attr("height", "100%");
		}
		else {
			svgWrap.append("img")
				.attr("src", `images/ball-${item.n}.svg`)
				.attr("alt", item.n)
				.style("width", "40px")
				.style("height", "40px");
		}
		const barCell = row.append("td");
		const bar = barCell.append("div").attr("class", "hot-bar");
		bar.append("div")
			.attr("class", "hot-bar-fill")
			.style("width", `${(item.count / maxCount) * 100}%`);
		row.append("td")
			.attr("class", "hc-count")
			.text(item.count);
	})

    // Cold list
    const coldList = d3.select("#cold-list");
    coldList.html("");
  
	const ctable = coldList.append("table");
	const ctbody = ctable.append("tbody");
	sortedCold.forEach((item, i) => {
		const row = ctbody.append("tr");
		row.append("td").text(`#${i + 1}`);
		const ballCell = row.append("td");
		const svgWrap = ballCell.append("div").attr("class", "hc-ball-svg");
		if (i < 3) {
			svgWrap.append("img")
				.attr("src", `images/ball-${item.n}.svg`)
				.attr("alt", item.n)
				.attr("width", "100%")
				.attr("height", "100%");
		}
		else {
			svgWrap.append("img")
				.attr("src", `images/ball-${item.n}.svg`)
				.attr("alt", item.n)
				.style("width", "40px")
				.style("height", "40px");
		}
		const barCell = row.append("td");
		const bar = barCell.append("div").attr("class", "cold-bar");
		bar.append("div")
			.attr("class", "cold-bar-fill")
			.style("width", `${(item.count / maxCount) * 100}%`);
		row.append("td")
			.attr("class", "hc-count")
			.text(item.count);
	})
}

// Independent frequency calculation
async function loadFrequencyDataHotCold() {
  const data = await d3.csv("Mark_Six.csv");
  freqData = {};

  data.forEach(draw => {
    const mainNumbers = [
      +draw['Winning Number 1'],
      +draw['2'], +draw['3'], +draw['4'], +draw['5'], +draw['6']
    ];
    const extraNum = +draw['Extra Number'];

    mainNumbers.forEach(n => {
      if (n >= 1 && n <= 49) freqData[n] = (freqData[n] || 0) + 1;
    });

    if (includeExtraPage3) {
      if (extraNum >= 1 && extraNum <= 49) {
        freqData[extraNum] = (freqData[extraNum] || 0) + 1;
      }
    }
  });
}

// ==============================
// Page 4: Co-occurrence 
// ==============================
let markSixData = [];
let matrix;
let minRange = 0;
let maxRange = 0;
let mid = 0;
let allValues;
let strokeScale;
let opacityScale;
let selectedIndex = -1;
let activePair = null;

async function startCooccurPage() {
	markSixData = await loadCSVData();
	countPairwiseNumbers();

    maxRange = Math.max(...matrix.flat()); 
	minRange = Math.min(...matrix.flat().filter(v => v > 0));
	mid = Math.floor((maxRange + minRange) / 2);
	
	strokeScale = d3.scaleLinear()
		.domain([minRange, maxRange])
		.range([0.1, 10]);
	
	opacityScale = d3.scaleLinear()
		.domain([minRange, maxRange])
		.range([0.2, 1.0])
		.clamp(true);

	document.getElementById('thresholdSlider').setAttribute('min', minRange);
	document.getElementById('thresholdSlider').setAttribute('max', maxRange);
	document.getElementById('thresholdSlider').setAttribute('value', mid);
	document.getElementById('range-value').innerText = mid;
	document.getElementById('min-range').innerText = minRange;
	document.getElementById('max-range').innerText = maxRange;
		
    drawChordDiagram(mid);

	const slider = document.getElementById('thresholdSlider');
	slider.addEventListener('input', function() {
		const threshold = +this.value;
		drawChordDiagram(threshold);

		document.getElementById('thresholdSlider').setAttribute('value', threshold);
        document.getElementById('range-value').value = threshold;
		resetDiagram(threshold);
	});
	
	const box = document.getElementById('clickable-box');
	box.addEventListener('click', () => resetDiagram(mid));
	
	renderTopPairs();
}

function updateRangeValue(val) {
	rangeValue = val;
	document.getElementById('range-value').textContent = val;
}
	
function handleNodeClick(event, d) {
	selectedIndex = d.index;
	const threshold = +document.getElementById('thresholdSlider').value;

	let tempMax = Math.max(...matrix[selectedIndex]);
	strokeScale = d3.scaleLinear()
		.domain([threshold, tempMax])
		.range([1, 10]);
		
	opacityScale = d3.scaleLinear()
		.domain([threshold, tempMax])
		.range([0.7, 1])
		.clamp(true);
		
	let connectedIndices = new Set([selectedIndex]);

	d3.selectAll(".ribbon")
//		.transition()
//		.duration(200)
		.style("stroke-width", d => strokeScale(d.source.value) + "px")
		.style("opacity", ribbon => {
			const isConnected = ribbon.source.index === selectedIndex || ribbon.target.index === selectedIndex;
			const isAboveThreshold = ribbon.source.value >= threshold;
						
			if (isConnected && isAboveThreshold) {
				connectedIndices.add(ribbon.source.index);
				connectedIndices.add(ribbon.target.index);
			}
						
			return (isConnected && isAboveThreshold)
				? opacityScale(ribbon.source.value) : 0; // 0.9
		});
					
	d3.selectAll(".labels")
		.select("circle")
		.style("fill", function(group) {
			return connectedIndices.has(group.index) ? getMarkSixColor(group.index) : "white";
		});
		
	d3.selectAll(".labels")
		.filter(group => connectedIndices.has(group.index))
		.select("text")
		.style("opacity", 1);

	event.stopPropagation();
}

function drawChordDiagram(threshold) {
	const width = 800; //400
	const height = 800; //400
	const outerRadius = Math.min(width, height) * 0.5 - 80; // 40
	const innerRadius = outerRadius - 40; // 20
	const labelRadius = outerRadius + 30; // 15

	strokeScale = d3.scaleLinear()
		.domain([threshold, maxRange])
		.range([1, 10])
		.clamp(true);

	opacityScale = d3.scaleLinear()
		.domain([threshold, maxRange])
		.range([0.3, 1.0]);
		
	const chord = d3.chord()
		.padAngle(0.02) // 0.05
		.sortSubgroups(d3.descending);

	const chords = chord(matrix);
		
    const container = d3.select("#cooccur-svg-container");
    container.html("");
    svg = container.append("svg")
	   .attr("viewBox", [-width / 2, -height / 2, width, height]);
		
	const ribbonGroup = svg.append("g").attr("id", "ribbon-container");
	const arcGroup = svg.append("g").attr("id", "arc-container");
	const labelGroup = svg.append("g").attr("id", "label-container");
		
	const group = arcGroup.selectAll("g")
		.data(chords.groups)
		.join("g")
		.attr("class", "group")
		.style("cursor", "pointer")
		.on("click", handleNodeClick);
			
	group.append("path")
		.attr("fill", d => getMarkSixColor(d.index))
		.attr("stroke", d => d3.rgb(getMarkSixColor(d.index)).darker())
		.attr("d", d3.arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius)
		);

	ribbonGroup.style("fill-opacity", 0.67)
		.selectAll("path")
		.data(chords.map(d => {
				const sourceGroup = chords.groups[d.source.index];
				const targetGroup = chords.groups[d.target.index];
				const sourceMid = (sourceGroup.startAngle + sourceGroup.endAngle) / 2;
				const targetMid = (targetGroup.startAngle + targetGroup.endAngle) / 2;
				return {
					...d, 
					source: {
						...d.source,
						startAngle: sourceMid,
						endAngle: sourceMid
					},
					target: {
						...d.target,
						startAngle: targetMid,
						endAngle: targetMid
					}
				};
		}))
		.join("path")
			.attr("class", "ribbon")
			.attr("d", d3.ribbon().radius(innerRadius))
			.attr("fill", "none")
			.attr("stroke", d => d3.rgb(getMarkSixColor(d.source.index)).darker())
			.style("vector-effect", "non-scaling-stroke")
			.attr("stroke-width", d => strokeScale(d.source.value) + "px")
			.style("stroke-opacity", d => opacityScale(d.source.value)) // 0.8
			//.append("title")
			//	.text(d => `${allValues[d.source.index]} \u{2194} ${allValues[d.target.index]}: ${d.source.value}`) ;
					
	const labels = labelGroup.selectAll("g")
		.data(chords.groups)
		.join("g")
		.attr("class", "labels")
		.attr("transform", d => {
			return `
				rotate(${((d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90)})
				translate(${labelRadius})
				${"rotate(90)"}
			`;
		})
		.on("click", handleNodeClick)
		.style("cursor", "pointer");
		
	const text = labels.append("text")
		.attr("dy", "0.35em")
		.attr("text-anchor", "middle")
		.text(d => d.index + 1)
		.style("font-family", "sans-serif")
		.style("font-size", "20px") // 10px
		.style("font-weight", "bold")
		.style("cursor", "default")
		.style("user-select", "none")
		.style("pointer-events", "none");
		
	labels.insert("circle", "text")
		.attr("fill", "white")
		.attr("stroke", d => getMarkSixColor(d.index))
		.attr("stroke-width", 2) // 1
		.attr("r", "20px"); // 10px
			
	svg.on("click", () => {
		const threshold = +document.getElementById('thresholdSlider').value;
		resetDiagram(threshold);
	});
}
	
function resetDiagram(threshold) {
	document.getElementById('thresholdSlider').value = threshold;
	//updateRangeValue(mid);
	updateRangeValue(threshold);
	
	d3.selectAll(".ribbon")
//		.transition()
//		.duration(200)
		.style("opacity", d => {
			return d.source.value >= threshold ? opacityScale(d.source.value) : 0 // 0.7
		})
		.style("pointer-events", d => {
			return d.source.value >= threshold ? "auto" : "none";
		})
		.style("stroke", d => d3.rgb(getMarkSixColor(d.source.index)).darker());
			
		d3.selectAll(".labels")
			.select("circle")
			.style("fill", "white");
				
	d3.selectAll(".group").style("opacity", 1);
	drawChordDiagram(threshold);
	selectedIndex = -1;
}

async function loadCSVData() {
	try {
		const response = await fetch('Mark_Six.csv');
		const data = await response.text();
			
		const rows = data.split('\n').filter(row => row.trim() !== '').slice(1);
			
		return rows.map(row => {
			const columns = row.split(',');
			return {
				date: columns[1],
				numbers: [3,4,5,6,7,8,9].map(i => columns[i]?.trim()),
				special: columns[9]?.trim()
			};
		});
	} catch (error) {
		console.log("Cound not load CSV:", error);
		return [];
	}
}
	
function countPairwiseNumbers() {
	allValues = [...new Set(markSixData.flatMap(d => d.numbers))].sort((a, b) => a - b);
	const size = allValues.length;
	const indexMap = new Map(allValues.map((v, i) => [v, i]));
	matrix = Array.from({length: size}, () => Array(size).fill(0));
		
	markSixData.forEach(obj => {
		const arr = obj.numbers;
		arr.forEach(sourceVal => {
			arr.forEach(targetVal => {
				if (sourceVal !== targetVal) {
					const i = indexMap.get(sourceVal);
					const j = indexMap.get(targetVal);
					matrix[i][j]++;
				}
			});
		});
	});
}

async function renderTopPairs() {
	if (!matrix) return;

	// Top 10 pairs
	const topPairs = await getTopPairs(10);

    const container = document.getElementById("top-pairs-container");
    container.innerHTML = "";
  
    topPairs.forEach(p => {
        const el = document.createElement("div");
        el.className = "pair-card";
        
        el.onclick = () => {
            if (activePair?.a === p.a && activePair?.b === p.b) {
              activePair = null;
              resetChords();
            } else {
              activePair = { a: p.a, b: p.b };
              highlightChord(p.a, p.b);
            }
        };

		el.innerHTML = `
			<div class="pair-left">
				<div class="pair-ball" style="background-color: ${getMarkSixColor(+p.a)};">${p.a}</div>
				<span class="pair-arrow">↔</span>
				<div class="pair-ball" style="background-color: ${getMarkSixColor(+p.b)};">${p.b}</div>
			</div>
			<div class="pair-right">
				<div class="pair-count">${p.cnt}</div>
				<span class="pair-text">times</span>
			</div>
		`;
		container.appendChild(el);
    });
}

async function getTopPairs(count = 9) {
	let pairs = [];
	
	for (let i = 0; i< matrix.length; i++) {
		for (let j = i + 1; j < matrix[i].length; j++) {
			if (matrix[i][j] > 0) {
				pairs.push({
					a: allValues[i],
					b: allValues[j],
					cnt: matrix[i][j]
				});
			}
		}
	}
	pairs.sort((a, b) => b.cnt - a.cnt);
		
	return pairs.slice(0, count);
}

function highlightChord(num1, num2) {
	const sourceIndex = allValues.indexOf(num1);
	const targetIndex = allValues.indexOf(num2);
	
	if (sourceIndex === -1 || targetIndex === -1) {
		console.log("Number not found:", num1, num2);
		return;
	}
	
	d3.selectAll(".ribbon")
		.style("opacity", d => {
			return (d.source.index === sourceIndex && d.target.index === targetIndex) ||
			(d.target.index === sourceIndex && d.source.index === targetIndex) ? 1 : 0; // 0.02
		})
		.style("stroke-width", d => {
			return ((d.source.index === sourceIndex && d.target.index === targetIndex) ||
			(d.target.index === sourceIndex && d.source.index === targetIndex)) ? 10 : strokeScale(d.source.value);
		});
}

function resetChords() {
	const threshold = +document.getElementById('thresholdSlider').value;
	resetDiagram(threshold);
}


/*
let cooccurMatrix = {};
let cooccurSvg;
let linksGroup;
let nodesGroup;
let activePair = null;
let includeExtraPage4 = true;
let focusedNumber = null; 

function getNumberColor(n) {
  const hue = ((n-1) * 360) / 49;
  return `hsl(${hue}, 85%, 60%)`;
}

// Bind checkbox switch
document.addEventListener('DOMContentLoaded', () => {
  const check = document.getElementById('includeExtraPage4');
  check.checked = true;

  check.addEventListener('change', async () => {
    includeExtraPage4 = check.checked;
    d3.select("#thresholdSlider").property("value", 47);
  
    const svg = d3.select("#cooccur-svg-container svg");
    svg.style("opacity", 0);
  
    setTimeout(async () => {
      await startCooccurPage();
      svg.style("opacity", 1);
    }, 250);
  });
});

async function startCooccurPage() {
  await buildCooccurrenceMatrix();

  const width = 800;
  const height = 800;
  const radius = Math.min(width, height) / 2 - 40;

  const container = d3.select("#cooccur-svg-container");
  container.html("");
  
  cooccurSvg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width/2}, ${height/2})`);

  linksGroup = cooccurSvg.append("g").attr("class", "links");
  nodesGroup = cooccurSvg.append("g").attr("class", "nodes");

  const numbers = d3.range(1, 50);
  const angleStep = (2 * Math.PI) / numbers.length;
  const positions = {};
  numbers.forEach((n, i) => {
    const angle = i * angleStep - Math.PI / 2;
    positions[n] = {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  });

  // Node rainbow colors + click function
  nodesGroup.selectAll("circle.cooccur-node")
  .data(numbers)
  .join("circle")
  .attr("class", "cooccur-node")
  .attr("cx", d => positions[d].x)
  .attr("cy", d => positions[d].y)
  .attr("r", 18)
  .attr("fill", d => getNumberColor(d))
  .attr("stroke", "#fff")
  .attr("stroke-width", 2)
  .style("cursor", "pointer")
  .on("click", (e, num) => {
    // Switch focus / defocus
    focusedNumber = focusedNumber === num ? null : num;
    updateLinkFilter();
  });

  nodesGroup.selectAll("text.cooccur-text")
    .data(numbers)
    .join("text")
    .attr("class", "cooccur-text")
    .attr("x", d => positions[d].x)
    .attr("y", d => positions[d].y)
    .attr("dominant-baseline", "middle")
    .text(d => d);

  const slider = d3.select("#thresholdSlider");
  slider.on("input", () => {
    const threshold = +slider.property("value");
    drawCooccurrenceLinks(positions, threshold);
  });

  drawCooccurrenceLinks(positions, 47);
  renderTopPairs();
}

// After clicking the number, only the related connection is displayed.
function updateLinkVisibility() {
  d3.selectAll("path.cooccur-link").each(function() {
    const d = d3.select(this).datum();
    if (!focusedNumber) {
      d3.select(this).style("display", "block");
    } else {
      if (d.source === focusedNumber || d.target === focusedNumber) {
        d3.select(this).style("display", "block");
      } else {
        d3.select(this).style("display", "none");
      }
    }
  });
}

async function buildCooccurrenceMatrix() {
  const data = await d3.csv("Mark_Six.csv");
  cooccurMatrix = {};

  for (let a = 1; a <= 49; a++) {
    cooccurMatrix[a] = {};
    for (let b = 1; b <= 49; b++) {
      cooccurMatrix[a][b] = 0;
    }
  }

  data.forEach(d => {
    const mainNumbers = [
      +d["Winning Number 1"], 
      +d["2"], 
      +d["3"], 
      +d["4"], 
      +d["5"], 
      +d["6"]
    ].filter(n => !isNaN(n));
    
    const extraNum = +d["Extra Number"];
    let nums = [...mainNumbers];
    
    if (includeExtraPage4 && !isNaN(extraNum)) {
      nums.push(extraNum);
    }

    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i];
        const b = nums[j];
        if (a !== b) {
          cooccurMatrix[a][b]++;
          cooccurMatrix[b][a]++;
        }
      }
    }
  });
}

function drawCooccurrenceLinks(positions, threshold) {
  const links = [];
  let maxCount = 0;

  for (let a = 1; a <= 49; a++) {
    for (let b = a + 1; b <= 49; b++) {
      const count = cooccurMatrix[a][b];
      if (count >= threshold) {
        links.push({ source: a, target: b, count: count });
        if (count > maxCount) maxCount = count;
      }
    }
  }

  const widthScale = d3.scaleLinear()
    .domain([threshold, maxCount])
    .range([0.5, 10]);

  const linkSelection = linksGroup.selectAll("path.cooccur-link")
    .data(links, d => `${d.source}-${d.target}`);

  linkSelection.exit().remove();

  linkSelection.enter()
    .append("path")
    .attr("class", "cooccur-link")
    .merge(linkSelection)
    .attr("d", d => {
      const sx = positions[d.source].x;
      const sy = positions[d.source].y;
      const tx = positions[d.target].x;
      const ty = positions[d.target].y;
      const mx = (sx + tx) / 4;  
      const my = (sy + ty) / 4;
      return `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;
    })
    .style("fill", "none")
    .style("stroke-width", d => widthScale(d.count))
    .style("stroke", d => getNumberColor(d.source))
    .style("stroke-opacity", 0.85)
    .attr("data-original-width", d => widthScale(d.count))
    .attr("data-original-color", d => getNumberColor(d.source));

  updateLinkVisibility();
  updateLinkFilter();
}
// Number Filtering: Hide/Show Lines
function updateLinkFilter() {
  d3.selectAll("path.cooccur-link").each(function(){
    const d = d3.select(this).datum();
    if(!focusedNumber){
      // No filter: Show all
      d3.select(this).style("display","block");
    }else{
      // Selected Numbers: Only related connections will be displayed.
      const isRelated = (d.source === focusedNumber) || (d.target === focusedNumber);
      d3.select(this).style("display", isRelated ? "block" : "none");
    }
  });
}

function renderTopPairs() {
  if (!cooccurMatrix) return;

  const allPairs = [];
  for (let a = 1; a <= 49; a++) {
    for (let b = a + 1; b <= 49; b++) {
      const cnt = cooccurMatrix[a][b];
      if (cnt > 0) {
        allPairs.push({ a, b, cnt });
      }
    }
  }

  const topPairs = allPairs.sort((x, y) => y.cnt - x.cnt).slice(0, 10);
  const container = document.getElementById("top-pairs-container");
  container.innerHTML = "";
  container.style.opacity = "0";

  topPairs.forEach((p, index) => {
      const el = document.createElement("div");
      el.className = "pair-card";
      el.style.opacity = "0"; 
      el.style.transform = "translateY(6px)";

      el.onclick = () => {
        const pairNumA = p.a;
        const pairNumB = p.b;
        // If there is currently a locked number, and this pair is unrelated to the locked number.
        if(focusedNumber !== null 
          && focusedNumber !== pairNumA 
          && focusedNumber !== pairNumB)
        {
          // Automatically cancel number filtering
          focusedNumber = null;
          updateLinkFilter();
        }
      
        if (activePair?.a === p.a && activePair?.b === p.b) {
          activePair = null;
          clearAllHighlight();
        } else {
          activePair = { a: p.a, b: p.b };
          highlightConnection(p.a, p.b);
        }
      };

      el.innerHTML = `
          <div class="pair-left">
              <div class="pair-ball purple">${p.a}</div>
              <span class="pair-arrow">↔</span>
              <div class="pair-ball blue">${p.b}</div>
          </div>
          <div class="pair-right">
              <div class="pair-count">${p.cnt}</div>
              <span class="pair-text">times</span>
          </div>
      `;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, index * 40);
  });

  setTimeout(() => {
    container.style.opacity = "1";
  }, 100);
}

function highlightConnection(a, b) {
  clearAllHighlight();

  d3.selectAll("path.cooccur-link").each(function (d) {
    if (
      (d.source === a && d.target === b) ||
      (d.source === b && d.target === a)
    ) {
      d3.select(this)
        .style("stroke", "#000000")
        .style("stroke-width", 10)
        .style("stroke-opacity", 1)
        .raise();
    }
  });
}
  
function clearAllHighlight() {
  d3.selectAll("path.cooccur-link").each(function () {
    const originalColor = d3.select(this).attr("data-original-color");
    const originalWidth = d3.select(this).attr("data-original-width");

    d3.select(this)
      .style("stroke", originalColor)
      .style("stroke-width", originalWidth)
      .style("stroke-opacity", 0.85);
  });
}*/

// ==============================
// Page 5: Randomness
// ==============================
async function startRandomnessPage() {
  // Load data
  const data = await d3.csv("Mark_Six.csv");

  // Count the number of times each number appears
  const numCounts = {};
  for (let n = 1; n <= 49; n++) numCounts[n] = 0;

  // Calculate the sum of the 6 numbers in each period.
  const sumList = [];

  data.forEach(row => {
    const nums = [
      +row["Winning Number 1"],
      +row["2"],
      +row["3"],
      +row["4"],
      +row["5"],
      +row["6"]
    ].filter(x => !isNaN(x));

    // Number of frequencies
    nums.forEach(n => {
      if (n >= 1 && n <= 49) numCounts[n]++;
    });

    // Total for each draw
    if (nums.length === 6) {
      const sum = nums.reduce((a, b) => a + b, 0);
      sumList.push(sum);
    }
  });

  // Left Individual statistics
  const values = Object.values(numCounts);
  const avg = d3.mean(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = d3.variance(values);
  const randomness = variance < 30 ? "✅ Approx Uniform" : "❌ Not Uniform";

  document.getElementById("avg-count").innerText = avg.toFixed(1);
  document.getElementById("min-count").innerText = min;
  document.getElementById("max-count").innerText = max;
  document.getElementById("variance").innerText = variance.toFixed(2);
  document.getElementById("random-result").innerText = randomness;

  // Right Sum statistics
  const sumMean = d3.mean(sumList);
  const sumMin = Math.min(...sumList);
  const sumMax = Math.max(...sumList);
  const sumStd = d3.deviation(sumList);
  // Reasonable range of standard deviation, Determine whether it is close to the normal range
  const normalCheck = sumStd > 25 && sumStd < 55 
    ? "✅ Approx Normal" 
    : "❌ Skewed";

  document.getElementById("sum-mean").innerText = sumMean.toFixed(1);
  document.getElementById("sum-min").innerText = sumMin;
  document.getElementById("sum-max").innerText = sumMax;
  document.getElementById("sum-std").innerText = sumStd.toFixed(2);
  document.getElementById("normal-result").innerText = normalCheck;

  // Draw the Chart
  drawIndividualChart(numCounts);
  drawSumChart(sumList);
}

// Left: Number of occurrences of numbers 1-49
function drawIndividualChart(counts) {
  const container = d3.select("#chart-individual");
  container.html("");

  // Floating tooltip
  const tooltip = d3.select("body").append("div")
    .attr("id", "chart-random-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "14px")
    .style("z-index", 1000)
    .style("display", "none");
      
  const margin = { top:20, right:0, bottom:50, left:42 };
  const w = 800;
  const h = 450;

  const svg = container.append("svg")
    .attr("width", w)
    .attr("height", h);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const data = [];
  for (let n=1; n<=49; n++) {
    data.push({ num:n, count:counts[n] });
  }

  const x = d3.scaleBand()
    .domain(data.map(d => d.num))
    .range([0, innerW])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d=>d.count) + 5])
    .range([innerH, 0]);

  // bar with hover effect
  g.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.num))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => innerH - y(d.count))
    .attr("fill", "#4285F4")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#1976D2");
      tooltip.style("display", "block")
        .html(`Number: ${d.num}<br>Frequency: ${d.count}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "#4285F4");
      tooltip.style("display", "none");
    });

  // mean line
  const avg = d3.mean(data, d=>d.count);
  g.append("line")
    .attr("x1", 0)
    .attr("x2", innerW)
    .attr("y1", y(avg))
    .attr("y2", y(avg))
    .attr("stroke", "red")
    .attr("stroke-width",2)
    .attr("stroke-dasharray","4,4");
  
  g.append("text")
    .attr("x", innerW - 100)
    .attr("y", y(avg) - 8)           // A little above the line
    .attr("text-anchor", "end")      // Right alignment
    .attr("fill", "red")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text(`Average: ${avg.toFixed(1)}`);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("font-size",9);

  g.append("g")
    .call(d3.axisLeft(y));
  
  //  X & Y Axis Label
  g.append("text")
    .attr("x", innerW / 2 -20)
    .attr("y", innerH + 40)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -innerH / 2)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Frequency");
}

// Left：Sum of 6 numbers
function drawSumChart(sumList) {
  const container = d3.select("#chart-sum");
  container.html("");

  // Floating tooltip
  const tooltip = d3.select("body").append("div")
    .attr("id", "chart-random-tooltip-sum")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "14px")
    .style("z-index", 1000)
    .style("display", "none");


  const margin = { top:20, right:20, bottom:50, left:60 };
  const w = 700;
  const h = 450;

  const svg = container.append("svg")
    .attr("width", w)
    .attr("height", h);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain([d3.min(sumList), d3.max(sumList)])
    .range([0, innerW]);

  const bins = d3.histogram()
    .domain(x.domain())
    .thresholds(20)
    (sumList);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d=>d.length) + 2])
    .range([innerH, 0]);

  // bar with hover effect
  g.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", d => innerH - y(d.length))
    .attr("fill", "#ff6b6b")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#e53935");
      tooltip.style("display", "block")
        .html(`Sum: ${d.x0} - ${d.x1}<br>Count: ${d.length}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "#ff6b6b");
      tooltip.style("display", "none");
    });

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  // X & Y Axis Label
  g.append("text")
    .attr("x", innerW / 2 + 35)
    .attr("y", innerH + 40)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Sum of 6 Numbers");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 25)
    .attr("x", -innerH / 2)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Count");
}

// ==============================
// Page 6: Colour Chart
// ==============================
let colourDrawData = [];
let colourSortMode = null; 

async function startColourPage() {
  const raw = await d3.csv("Mark_Six.csv");

  colourDrawData = raw.map(d => {
    const main = [
      +d["Winning Number 1"],
      +d["2"],
      +d["3"],
      +d["4"],
      +d["5"],
      +d["6"]
    ].filter(n => !isNaN(n));

    const extra = +d["Extra Number"] || null;
    return {
      date: d["Date"],
      main,
      extra
    };
  });

  d3.select("#includeExtra").on("change", updateColourChart);
  updateColourChart();
}

function updateColourChart() {
  const includeExtra = d3.select("#includeExtra").property("checked");
  computeColourStats(includeExtra);
  drawColourBarChart();
  drawColourDrawTable();
}

let colourSummary = [];

function computeColourStats(includeExtra) {
  let redMain = 0, redExtra = 0;
  let blueMain = 0, blueExtra = 0;
  let greenMain = 0, greenExtra = 0;

  colourDrawData.forEach(row => {
    // Calculate main number only
    row.main.forEach(n => {
      if(redNumbers.includes(n)) redMain++;
      if(blueNumbers.includes(n)) blueMain++;
      if(greenNumbers.includes(n)) greenMain++;
    });
    // Calculate extra number separately
    if(row.extra) {
      const n = row.extra;
      if(redNumbers.includes(n)) redExtra++;
      if(blueNumbers.includes(n)) blueExtra++;
      if(greenNumbers.includes(n)) greenExtra++;
    }
  });

  colourSummary = [
    {
      name: "Red",
      main: redMain,
      extra: redExtra,
      total: redMain + redExtra,
      fill: "#ff6b6b"
    },
    {
      name: "Blue",
      main: blueMain,
      extra: blueExtra,
      total: blueMain + blueExtra,
      fill: "#4dabf7"
    },
    {
      name: "Green",
      main: greenMain,
      extra: greenExtra,
      total: greenMain + greenExtra,
      fill: "#51c466"
    }
  ];
}

function drawColourBarChart() {
  const container = d3.select("#colour-summary-chart");
  container.html("");

  const width = 800;
  const height = 600;
  const margin = { top: 40, right: 30, bottom: 50, left: 70 };

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const includeExtra = d3.select("#includeExtra").property("checked");

  const x = d3.scaleBand()
    .domain(["Red", "Blue", "Green"])
    .range([0, width])
    .padding(0.4);

  // Fixed Y-axis
  const fixedMax = d3.max(colourSummary, d => d.total);
  const y = d3.scaleLinear()
    .domain([0, fixedMax])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .style("font-size", "16px");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(10))
    .style("font-size", "13px");

// Main bar
svg.selectAll("rect.main")
  .data(colourSummary)
  .enter()
  .append("rect")
  .attr("class", "main-bar")
  .attr("x", d => x(d.name))
  .attr("y", d => y(d.main))
  .attr("width", x.bandwidth())
  .attr("height", d => height - y(d.main))
  .attr("fill", d => d.fill)
  .attr("rx", 6)
  .style("cursor", "pointer")
  // Preset transparency (light color, gentle on the eyes)
  .style("opacity", 0.75)
  .on("click", function(e, d) {
    const key = d.name.toLowerCase();
    // Repeated click = Cancel sorting
    colourSortMode = (colourSortMode === key) ? null : key;

    // Reset all bars globally to the default style.
    svg.selectAll(".main-bar")
      .style("opacity", 0.75)
      .style("stroke", "none")
      .style("stroke-width", 0);

    // Currently clicked bar highlighted
    if(colourSortMode){
      d3.select(this)
        .style("opacity", 1)
        .style("stroke", "#222")
        .style("stroke-width", 3);
    }

    // Re-render the right-hand number grouping
    drawColourDrawTable();
  });

  // Check the box, then Draw Extra + separator line
  if (includeExtra) {
    svg.selectAll("rect.extra")
      .data(colourSummary)
      .enter()
      .append("rect")
      .attr("class", "extra")
      .attr("x", d => x(d.name))
      .attr("y", d => y(d.total))
      .attr("width", x.bandwidth())
      .attr("height", d => y(d.main) - y(d.total))
      .attr("fill", d => d.fill)
      .attr("opacity", 0.3)
      .attr("rx", 4);

    // White dividing line
    svg.selectAll(".divider")
      .data(colourSummary)
      .enter()
      .append("line")
      .attr("x1", d => x(d.name))
      .attr("x2", d => x(d.name) + x.bandwidth())
      .attr("y1", d => y(d.main))
      .attr("y2", d => y(d.main))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
  }

  //Text display logic
  if (includeExtra) {
    // Main in the center of the bar.
    svg.selectAll(".text-main-inside")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => height - (height - y(d.main)) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text(d => d.main)
      .style("fill", "#000")
      .style("font-weight", "bold")
      .style("font-size", "16px");

    // Extra in the center of the light-colored area.
    svg.selectAll(".text-extra-inside")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => y(d.total) + (y(d.main) - y(d.total)) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text(d => d.extra)
      .style("fill", "#000")
      .style("font-weight", "bold")
      .style("font-size", "15px");

    // Top: Total
    svg.selectAll(".text-total")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => y(d.total) - 12)
      .attr("text-anchor", "middle")
      .text(d => `Total: ${d.total}`)
      .style("fill", "#222")
      .style("font-weight", "bold")
      .style("font-size", "15px");

  } else {
    // Top: Main
    svg.selectAll(".text-only-main")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => y(d.main) - 12)
      .attr("text-anchor", "middle")
      .text(d => d.main)
      .style("fill", "#222")
      .style("font-weight", "bold")
      .style("font-size", "16px");
  }

  svg.append("text")
  .attr("x", width / 2)
  .attr("y", height + 40)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#333")
  .text("Colour");

  svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - margin.left + 15)
  .attr("x", 0 - height / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#333")
  .text("Frequency");

  svg.append("text")
  .attr("x", width / 2)
  .attr("y", 0)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#444")
  .style("font-weight", "500")
  .text("Click a color bar to group same-color balls on the right. Click again to reset");

}

// Right panel: colour results table
function drawColourDrawTable() {
  const wrap = d3.select("#colour-detail-table");
  wrap.html("");
  const includeExtra = d3.select("#includeExtra").property("checked");

  let showList = [...colourDrawData];

  // Sorting logic: First color + Second color + Last color
  showList.forEach(row => {
    let nums = includeExtra 
      ? [...row.main, row.extra].filter(n => n) 
      : [...row.main];

    if (colourSortMode) {
      let first  = []; // Selected color
      let second = []; 
      let third  = []; 

      nums.forEach(n => {
        const isRed = redNumbers.includes(n);
        const isBlue = blueNumbers.includes(n);
        const isGreen = greenNumbers.includes(n);

        if (colourSortMode === 'red') {
          if (isRed) first.push(n);
          else if (isBlue) second.push(n);
          else third.push(n);
        }
        else if (colourSortMode === 'blue') {
          if (isBlue) first.push(n);
          else if (isGreen) second.push(n);
          else third.push(n);
        }
        else if (colourSortMode === 'green') {
          if (isGreen) first.push(n);
          else if (isRed) second.push(n);
          else third.push(n);
        }
      });

      row.sortedNums = [...first, ...second, ...third];
    } else {
      row.sortedNums = nums;
    }
  });

  // Draw
  showList.forEach(row => {
    const line = wrap.append("div").attr("class", "draw-row");

    line.append("div")
      .attr("class", "draw-date")
      .text(row.date);

    row.sortedNums.forEach(n => {
      line.append("div")
        .attr("class", "colour-ball")
        .style("background", getMarkSixColor(n))
        .text(n);
    });
  });
}

// ==============================
// Page 7 - Weekday Heatmap
// ==============================
let weekdayFullData = [];
let includeExtraNumber = false;
let currentWeekday = "All";
let rawData = [];

async function startWeekdayHeatmap() {
  rawData = await d3.csv("Mark_Six.csv");
  
  // First Statistical
  recalculateData();
  
  // Draw Heatmap
  drawHeatmap(currentWeekday);

  // Weekday buttons
  d3.selectAll(".weekday-btn").on("click", function(){
    d3.selectAll(".weekday-btn").classed("active", false);
    d3.select(this).classed("active", true);
    currentWeekday = d3.select(this).text();
    drawHeatmap(currentWeekday);
  });

  // Extra Number Checkbox (Same Design as Page 3 / 6)
  const includeExtraPage7 = document.getElementById("includeExtraPage7");
  includeExtraPage7.checked = false;

  includeExtraPage7.addEventListener("change", function () {
    includeExtraNumber = this.checked; // Check = Include Extra
    recalculateData();
    drawHeatmap(currentWeekday);
  });
}

// Recalculate statistics based on includeExtraNumber
function recalculateData() {
  const count = {};
  const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  weekdays.forEach(w => count[w] = Array(50).fill(0));
  count.All = Array(50).fill(0);

  rawData.forEach(row => {
    const wd = row.Weekday.trim();
    const nums = [
      +row["Winning Number 1"], 
      +row["2"], 
      +row["3"],
      +row["4"], 
      +row["5"], 
      +row["6"]
    ];

    // Switch to Extra number mode
    if (includeExtraNumber) {
      nums.push(+row["Extra Number"]);
    }

    nums.forEach(n => {
      if(n>=1 && n<=49) {
        count[wd][n]++;
        count.All[n]++;
      }
    });
  });

  weekdayFullData = count;
}

// Draw Heatmap
function drawHeatmap(targetDay) {
  const container = d3.select("#weekday-heatmap");
  container.html("");

  const cols = 7;
  const rows = 7;
  const cellSize = 100;
  const width = cols * cellSize;
  const height = rows * cellSize;
  const margin = { top: 40, right: 20, bottom: 20, left: 20 };

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Prepare data: 1~49, corresponding to each cell.
  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const data = numbers.map((num, i) => ({
    num: num,
    count: weekdayFullData[targetDay][num],
    // Calculate cell position: which column, which row
    col: i % cols,
    row: Math.floor(i / cols)
  }));

  // Use the maximum/minimum value of the current day
  const counts = data.map(d => d.count);
  const minVal = d3.min(counts);
  const maxVal = d3.max(counts);

  // To prevent the color from failing when all values ​​are 0, the boundaries need to be processed
  const domainMax = maxVal === minVal ? minVal + 1 : maxVal;

  const colorScale = d3.scaleSequential()
    .domain([minVal, domainMax])
    .interpolator(d3.interpolateYlOrRd);

  // Draw grid
  svg.selectAll(".heat-cell")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", d => d.col * cellSize)
    .attr("y", d => d.row * cellSize)
    .attr("width", cellSize - 4) // -4 for leaving a little space
    .attr("height", cellSize - 4)
    .attr("fill", d => colorScale(d.count))
    .attr("rx", 10) // Rounded corners
    .attr("stroke", "#fff")
    .attr("stroke-width", 3);

  // Draw numbers and times
  svg.selectAll(".heat-text")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "heat-text")
    .attr("x", d => d.col * cellSize + cellSize / 2)
    .attr("y", d => d.row * cellSize + cellSize / 2 - 10)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(d => d.num)
    .style("fill", d => d.count > (minVal + (domainMax - minVal) * 0.6) ? "#fff" : "#000")
    .style("font-size", "28px")
    .style("font-weight", "bold");

  svg.selectAll(".heat-count")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "heat-count")
    .attr("x", d => d.col * cellSize + cellSize / 2)
    .attr("y", d => d.row * cellSize + cellSize / 2 + 15)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(d => `${d.count}x`)
    .style("fill", d => d.count > (minVal + (domainMax - minVal) * 0.6) ? "#fff" : "#333")
    .style("font-size", "16px");

  // 3. title of the heatmap
  let extraLabel = includeExtraNumber ? " (With Extra Number)" : " (Main Number Only)";
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(`Number Distribution Heatmap - ${targetDay}${extraLabel}`);
}

// ==============================
// Page 8 : Prize Money
// ==============================
let isLineChart = false;
let rawPointsGlobal = [];
let overallAverageFreqGlobal = 0;
let hideZeroJackpot = false;

// initialization
async function startPrizeChart() {
  const raw = await d3.csv("Mark_Six.csv");
  if (!Data || !Data.numberStats) return;

  rawPointsGlobal = raw.map(row => {
    const nums = [
      +row["Winning Number 1"],
      +row["2"],
      +row["3"],
      +row["4"],
      +row["5"],
      +row["6"]];

    let totalFreq = 0;
    nums.forEach(n => { totalFreq += Data.numberStats[n]?.appearances || 0; });

    const avgFreq = totalFreq / 6;

    const div1Winner = +row["Division 1 Winners"] || 0;
    const div1Prize = +row["Division 1 Prize"] || 0;
    const jackpot = div1Winner * div1Prize;

    const drawDate = row["Date"] || "N/A";

    return { avgFreq, jackpot, drawDate };
  });

  overallAverageFreqGlobal = d3.mean(rawPointsGlobal, d => d.avgFreq);

  hideZeroJackpot = false;
  d3.select("#filterZeroCheckbox").property("checked", false);

  renderChart();
}

// Rendering Chart
function renderChart() {
  let data = hideZeroJackpot
    ? rawPointsGlobal.filter(d => d.jackpot > 0)
    : rawPointsGlobal;

  if (isLineChart) renderLineChart(data);
  else renderScatterChart(data);
}

// Rendering Scatter Chart
function renderScatterChart(data) {
  const container = d3.select("#prize-scatter-chart");
  container.html("");
  d3.select("#toggleChartBtn").text("Switch to Line Chart");

  const w = 980, h = 550;
  const margin = {top:55, right:30, bottom:70, left:85};
  const svg = container.append("svg")
    .attr("width",w)
    .attr("height",h)
    .append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(data,d=>d.avgFreq)).range([0,innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(data,d=>d.jackpot)||1]).range([innerH,0]);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-prize-tooltip");

  // Scatter + Hover
  svg.selectAll(".chart-dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class","chart-dot")
    .attr("r",4.5)
    .attr("cx",d=>x(d.avgFreq))
    .attr("cy",d=>y(d.jackpot))
    .on("mouseover", function(event,d) {
      tooltip.style("opacity",1)
        .html(`
          Draw Date: ${d.drawDate}<br/>
          Average Appearance: ${d.avgFreq.toFixed(2)}<br/>
          Jackpot:HK$ ${(d.jackpot/1000000).toFixed(1)}  Million
        `)
        .style("left", (event.pageX+15)+"px")
        .style("top", (event.pageY-28)+"px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity",0);
    });

  // Vertical average line
  svg.append("line")
    .attr("class","vertical-average-line")
    .attr("x1",x(overallAverageFreqGlobal))
    .attr("x2",x(overallAverageFreqGlobal))
    .attr("y1",0)
    .attr("y2",innerH);

  // Vertical average line label
  svg.append("text")
    .attr("class","average-line-label")
    .attr("x",x(overallAverageFreqGlobal))
    .attr("y", -5)
    .text(`Average: ${overallAverageFreqGlobal.toFixed(2)}`);

  // X-axis and Y-axis tick marks + numbers
  svg.append("g").attr("transform",`translate(0,${innerH})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).tickFormat(d=>`${(d/1000000).toFixed(0)}M`));

  // X-axis label
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",innerH + 45)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Average Appearance of the 6 Drawn Number");

  // Y-axis label
  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-innerH/2).attr("y",-70)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Jackpot (HK$ Million)");

  // Title
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",-40)
    .style("text-anchor","middle")
    .style("font-size","20px")
    .style("font-weight","bold")
    .text(`Jackpot vs Number Frequency (Scatter ${hideZeroJackpot ? '- Exclude 0' : '- Include 0'})`);
}

// Rendering Scatter Chart
function renderLineChart(data) {
  const container = d3.select("#prize-scatter-chart");
  container.html("");
  d3.select("#toggleChartBtn").text("Switch to Scatter Chart");

  const bins = d3.bin().domain(d3.extent(data,d=>d.avgFreq)).thresholds(5)(data.map(d=>d.avgFreq));
  const lineData = bins.map(bin=>{
    const g = data.filter(d=>d.avgFreq>=bin.x0&&d.avgFreq<bin.x1);
    return g.length?{
      avgFreq:(bin.x0+bin.x1)/2,
      avgJackpot:d3.mean(g,d=>d.jackpot)
    }:null;
  }).filter(Boolean);

  const w = 980, h = 550;
  const margin = {top: 55, right: 30, bottom: 70, left: 85};
  const svg = container.append("svg")
    .attr("width",w)
    .attr("height",h)
    .append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(data,d=>d.avgFreq)).range([0,innerW]);

  const y = d3.scaleLinear().domain([0,d3.max(lineData,d=>d.avgJackpot)||1]).range([innerH,0]);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-prize-tooltip");

  // Line + Hover
  const line=d3.line()
    .x(d=>x(d.avgFreq))
    .y(d=>y(d.avgJackpot))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(lineData)
    .attr("class","chart-line-path")
    .attr("d",line);

  svg.selectAll(".chart-line-point")
    .data(lineData).enter().append("circle")
    .attr("class","chart-line-point").attr("r",7)
    .attr("cx",d=>x(d.avgFreq)).attr("cy",d=>y(d.avgJackpot))
    .on("mouseover", function(event,d) {
      tooltip.style("opacity",1)
        .html(`
          Frequency Group<br/>
          Group Avg: ${d.avgFreq.toFixed(2)}<br/>
          Avg Jackpot:HK$ ${(d.avgJackpot/1000000).toFixed(1)}  Million
        `)
        .style("left", (event.pageX+15)+"px")
        .style("top", (event.pageY-28)+"px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity",0);
    });

  // Vertical average line
  svg.append("line").attr("class","vertical-average-line")
    .attr("x1",x(overallAverageFreqGlobal))
    .attr("x2",x(overallAverageFreqGlobal))
    .attr("y1",0).attr("y2",innerH);

  // Vertical average line label
  svg.append("text").attr("class","average-line-label")
    .attr("x",x(overallAverageFreqGlobal))
    .attr("y",-5)
    .text(`Average: ${overallAverageFreqGlobal.toFixed(2)}`);

  // X-axis and Y-axis tick marks + numbers
  svg.append("g").attr("transform",`translate(0,${innerH})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).tickFormat(d=>`${(d/1000000).toFixed(0)}M`));

  // X-axis label
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",innerH + 45)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Average Appearance of the 6 Drawn Number");

  // Y-axis label
  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-innerH/2)
    .attr("y",-70)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Average Jackpot (HK$ Million)");

  // Title
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",-40)
    .style("text-anchor","middle")
    .style("font-size","20px")
    .style("font-weight","bold")
    .text(`Jackpot vs Number Frequency (Line ${hideZeroJackpot ? '- Exclude 0' : '- Include 0'})`);
}

// Buttons
d3.select("#toggleChartBtn").on("click",()=>{
  isLineChart=!isLineChart;
  renderChart();
});

d3.select("#filterZeroCheckbox").on("change", function() {
  // Get the status of the checkbox
  hideZeroJackpot = this.checked;
  renderChart();
});

// ==============================
// Page 9: Future Trend
// ==============================
async function startFutureTrend() {
  const raw = await d3.csv("Mark_Six.csv");

  let countMap = {};
  for(let i = 1; i <= 49; i++) countMap[i] = 0;

  raw.forEach(row => {
    const nums = [
      +row["Winning Number 1"],+row["2"],+row["3"],
      +row["4"],+row["5"],+row["6"]
    ];
    nums.forEach(n => {
      if(countMap[n] !== undefined) countMap[n]++;
    });
  });

  const data = d3.range(1,50).map(num => ({
    number: num,
    count: countMap[num]
  }));

  // Automatically sorted into cold/normal/hot
  const counts = data.map(d => d.count).sort(d3.ascending);
  const q1 = d3.quantile(counts, 0.25);
  const q3 = d3.quantile(counts, 0.75);

  const container = d3.select("#future-trend-chart");
  container.html("");

  const width = 1100;
  const height = 580;
  const margin = { top: 70, right: 20, bottom: 160, left: 60 };
  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(data.map(d => d.number))
    .range([0, innerW])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([innerH, 0]);

  // tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class","future-tooltip");

  // Long bar chart
  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.number))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => innerH - y(d.count))
    .attr("class", d => {
      if(d.count <= q1) return "future-bar-cold";
      if(d.count >= q3) return "future-bar-hot";
      return "future-bar-normal";
    })
    .on("mouseover", (e,d) => {
      let typeText;
      if(d.count <= q1) typeText = "✅ Recommended (Cold)";
      else if(d.count >= q3) typeText = "❌ Not Recommended (Hot)";
      else typeText = "⚫ Neutral";

      tooltip.style("opacity",1)
        .html(`Number: ${d.number}<br/>Appearances: ${d.count}<br/>${typeText}`)
        .style("left", e.clientX + 15 + "px")
        .style("top", e.clientY - 40 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity",0));

  // Axis Line
  svg.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(d3.range(1,50,2)));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Axis Labels
  svg.append("text")
    .attr("x", innerW/2)
    .attr("y", innerH + 45)
    .style("text-anchor","middle")
    .style("font-size","15px")
    .text("Lottery Number 1 – 49");

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x", -innerH/2)
    .attr("y", -45)
    .style("text-anchor","middle")
    .style("font-size","15px")
    .text("Total Appearance");

  // Title position
  svg.append("text")
    .attr("x", innerW/2)
    .attr("y", -35)
    .style("text-anchor","middle")
    .style("font-size","20px")
    .style("font-weight","bold")
    .text("Future Trend | Best Numbers to Choose");

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${innerW/2 - 220}, ${innerH + 80})`);

  legend.append("rect").attr("x",0).attr("y",0).attr("width",18).attr("height",18).attr("fill","#0066aa");
  legend.append("text").attr("x",30).attr("y",14).style("font-size","14px").text("Recommended (Cold Numbers)");

  legend.append("rect").attr("x",0).attr("y",30).attr("width",18).attr("height",18).attr("fill","#777");
  legend.append("text").attr("x",30).attr("y",44).style("font-size","14px").text("Neutral Numbers");

  legend.append("rect").attr("x",0).attr("y",60).attr("width",18).attr("height",18).attr("fill","#990000");
  legend.append("text").attr("x",30).attr("y",74).style("font-size","14px").text("Not Recommended (Hot Numbers)");
}
