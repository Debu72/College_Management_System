(function () {
  var $ = function (s) { return document.querySelector(s); };
  var NOW = Date.now(), DAY = 864e5;
  var dateFmt = { day: 'numeric', month: 'short', year: 'numeric' };
  function dateOf(ago) { return new Date(NOW - ago * DAY).toLocaleDateString('en-IN', dateFmt); }

  // ---------- Sample data (replace with real records later) ----------
  // "ago" = how many days ago the notice was posted
  var notices = [
    { ago: 1,  c: 'Exam',     t: 'Exam form fill-up for Semesters 1 and 3', x: 'Forms are available at the college office. Submit the form with your fee receipt before the last date printed on it.' },
    { ago: 2,  c: 'Academic', t: 'Practical classes shifted to Lab 2', x: 'Physics and Chemistry practical classes for Semesters 1 and 3 will be held in Lab 2 on the ground floor from next week.' },
    { ago: 4,  c: 'Event',    t: 'Science exhibition: register your project', x: 'Students can register projects with their department. Selected projects will be displayed in the college hall.' },
    { ago: 6,  c: 'Academic', t: 'Assignment 2 submission date extended', x: 'Assignment 2 for Calculus can be submitted for one more week. Submissions after that will not be accepted.' },
    { ago: 9,  c: 'Exam',     t: 'Internal assessment routine', x: 'The internal test routine for all semesters is on the department notice boards. Bring your college ID card to every test.' },
    { ago: 12, c: 'Event',    t: 'Blood donation camp by the NSS unit', x: 'The NSS unit will hold a camp in the college hall. Volunteers can give their names to the NSS coordinator.' },
    { ago: 16, c: 'Holiday',  t: 'College closed for Christmas', x: 'The college will remain closed on 25 December. Classes resume on the next working day.' },
    { ago: 22, c: 'Academic', t: 'Library timing during exams', x: 'During the exam period the library stays open until 6:00 pm on weekdays.' }
  ];
  var courses = [
    { code: 'PHY101', name: 'Mechanics and Properties of Matter', dept: 'Physics',             sem: 1, fac: 'Dr. R. Banerjee' },
    { code: 'MAT101', name: 'Basic Algebra',                      dept: 'Mathematics',         sem: 1, fac: 'Prof. S. Mondal' },
    { code: 'CHE102', name: 'Inorganic Chemistry',                dept: 'Chemistry',           sem: 2, fac: 'Dr. P. Das' },
    { code: 'CSC102', name: 'Programming in Python',              dept: 'Computer Science',    sem: 2, fac: 'Prof. T. Roy' },
    { code: 'PHY201', name: 'Waves and Optics',                   dept: 'Physics',             sem: 3, fac: 'Dr. R. Banerjee' },
    { code: 'MAT201', name: 'Calculus',                           dept: 'Mathematics',         sem: 3, fac: 'Dr. M. Ghosh' },
    { code: 'CSC202', name: 'Data Analysis with Python',          dept: 'Computer Science',    sem: 4, fac: 'Prof. T. Roy' },
    { code: 'EVS201', name: 'Environmental Science',              dept: 'Environmental Science', sem: 4, fac: 'Prof. K. Dutta' },
    { code: 'PHY301', name: 'Quantum Mechanics',                  dept: 'Physics',             sem: 5, fac: 'Dr. A. Sen' },
    { code: 'CHE301', name: 'Organic Chemistry',                  dept: 'Chemistry',           sem: 5, fac: 'Dr. P. Das' },
    { code: 'PHY302', name: 'Electronics',                        dept: 'Physics',             sem: 6, fac: 'Dr. A. Sen' },
    { code: 'MAT301', name: 'Differential Equations',             dept: 'Mathematics',         sem: 6, fac: 'Dr. M. Ghosh' }
  ];

  // ---------- Top bar date and mobile menu ----------
  $('#today').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  $('#menu').addEventListener('click', function () {
    var open = $('#nav').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('#nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      $('#nav').classList.remove('open');
      $('#menu').setAttribute('aria-expanded', false);
    });
  });

  // ---------- Latest notices (hero) ----------
  $('#latest').innerHTML = notices.slice(0, 3).map(function (n) {
    return '<li><a href="#notices">' + n.t + '</a><span>' + dateOf(n.ago) + '</span></li>';
  }).join('');

  // ---------- Notice board ----------
  var cat = 'All';
  var catBox = $('#cats');
  ['All', 'Exam', 'Academic', 'Event', 'Holiday'].forEach(function (name) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', function () { setCat(name); });
    catBox.appendChild(b);
  });
  function setCat(name) {
    cat = name;
    catBox.querySelectorAll('button').forEach(function (b) {
      var on = b.textContent === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    drawNotices();
  }
  function drawNotices() {
    var q = $('#nq').value.trim().toLowerCase();
    var list = notices.filter(function (n) {
      return (cat === 'All' || n.c === cat) && (n.t + ' ' + n.x).toLowerCase().indexOf(q) > -1;
    });
    $('#nlist').innerHTML = list.map(function (n) {
      return '<li><div class="meta">' + dateOf(n.ago) + '<span class="tag">' + n.c + '</span>' +
        (n.ago <= 7 ? '<span class="new">New</span>' : '') + '</div><h3>' + n.t + '</h3><p>' + n.x + '</p></li>';
    }).join('');
    $('#ncount').textContent = list.length
      ? 'Showing ' + list.length + ' of ' + notices.length + ' notices'
      : 'No notices match your search. Clear the search or choose another category.';
  }
  $('#nq').addEventListener('input', drawNotices);

  // ---------- Timetable ----------
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var times = ['10:00 am', '10:50 am', '11:40 am', '12:30 pm', '2:00 pm'];
  for (var s = 1; s <= 6; s++) {
    $('#tsem').insertAdjacentHTML('beforeend', '<option value="' + s + '">Semester ' + s + '</option>');
    $('#csem').insertAdjacentHTML('beforeend', '<option value="' + s + '">Semester ' + s + '</option>');
  }
  function drawTimetable() {
    var sem = +$('#tsem').value, shift = $('#tsec').value === 'B' ? 2 : 0;
    var subs = courses.filter(function (c) { return c.sem === sem; })
      .map(function (c) { return c.name; })
      .concat(['Practical', 'Tutorial', 'Library']);
    var today = new Date().getDay() - 1;
    var h = '<thead><tr><th>Day</th>' + times.map(function (t) { return '<th>' + t + '</th>'; }).join('') + '</tr></thead><tbody>';
    days.forEach(function (d, i) {
      h += '<tr' + (i === today ? ' class="today"' : '') + '><th scope="row">' + d + '</th>';
      times.forEach(function (t, p) { h += '<td>' + subs[(i + p + shift) % subs.length] + '</td>'; });
      h += '</tr>';
    });
    $('#ttable').innerHTML = h + '</tbody>';
  }
  $('#tsem').addEventListener('change', drawTimetable);
  $('#tsec').addEventListener('change', drawTimetable);

  // ---------- Courses ----------
  function drawCourses() {
    var sem = +$('#csem').value, q = $('#cq').value.trim().toLowerCase();
    var list = courses.filter(function (c) {
      return (!sem || c.sem === sem) && (c.code + ' ' + c.name + ' ' + c.dept + ' ' + c.fac).toLowerCase().indexOf(q) > -1;
    });
    $('#cbody').innerHTML = list.map(function (c) {
      return '<tr><td>' + c.code + '</td><td>' + c.name + '</td><td>' + c.dept + '</td><td>' + c.sem + '</td><td>' + c.fac + '</td></tr>';
    }).join('');
    $('#ccount').textContent = list.length
      ? 'Showing ' + list.length + ' of ' + courses.length + ' courses'
      : 'No courses match your search. Clear the search or choose another semester.';
  }
  $('#csem').addEventListener('change', drawCourses);
  $('#cq').addEventListener('input', drawCourses);

  // ---------- Hero search: filters notices and courses together ----------
  $('#heroSearch').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = $('#q').value.trim();
    $('#nq').value = q;
    $('#cq').value = q;
    $('#csem').value = '0';
    setCat('All');
    drawCourses();
    ($('#nlist').children.length ? $('#notices') : $('#courses')).scrollIntoView();
  });

  // ---------- Help desk form (requests are saved in this browser) ----------
  $('#hform').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('#hn').value.trim(), r = $('#hr').value.trim(), m = $('#hm').value.trim(), out = $('#hmsg');
    out.className = 'fmsg err';
    if (n.length < 2) { out.textContent = 'Enter your name.'; return; }
    if (r.length < 3) { out.textContent = 'Enter your roll number.'; return; }
    if (m.length < 10) { out.textContent = 'Write your request in at least 10 characters.'; return; }
    var all = [];
    try { all = JSON.parse(localStorage.getItem('helpdesk') || '[]'); } catch (x) {}
    var ref = 'HD-' + (1001 + all.length);
    all.push({ ref: ref, name: n, roll: r, message: m, time: new Date().toISOString() });
    try { localStorage.setItem('helpdesk', JSON.stringify(all)); } catch (x) {}
    this.reset();
    out.className = 'fmsg ok';
    out.textContent = 'Request sent. Your reference number is ' + ref + '.';
  });

  setCat('All');
  drawTimetable();
  drawCourses();
})();
