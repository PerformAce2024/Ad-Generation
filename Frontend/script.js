$(document).ready(function () {
  var changebox = $(".changebox");

  var firstclone = changebox.children(":first").clone();
  changebox.append(firstclone);

  function updateSizes() {
    var fontSize = parseFloat(changebox.parent().css("font-size"));
    var lineHeight = parseFloat(changebox.children("span:first").css("line-height"));
   
    changebox.css({
      "height": lineHeight + "px",
      "font-size": fontSize + "px"
    });
   
    return { fontSize: fontSize, lineHeight: lineHeight };
  }

  var sizes = updateSizes();
  ChangeSize(0);

  var animationInterval;
  function startAnimation() {
    if (!animationInterval) {
      animationInterval = setInterval(Next, 2000);
    }
  }
  function stopAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    Next.i = 0;
    changebox.scrollTop(0);
    ChangeSize(0);
  }
  function checkScreenSize() {
    sizes = updateSizes();
    if (window.innerWidth >= 200) {
      changebox.addClass('changebox-animate');
      startAnimation();
    } else {
      changebox.removeClass('changebox-animate');
      stopAnimation();
    }
  }
  checkScreenSize();
  $(window).resize(checkScreenSize);

  function Next(){
    if( typeof Next.i == 'undefined' ) {
      Next.i = 0;
    }
    Next.i++;
    if(Next.i == changebox.children("span").length){
      Next.i = 1;
      changebox.scrollTop(0);
    }
    changebox.animate({scrollTop: sizes.lineHeight * Next.i}, 500);
    setTimeout(function(){
      ChangeSize(Next.i);
    }, 500);
  }

  function ChangeSize(i){
    var word = changebox.children("span").eq(i);
    var wordsize = word.width();
    if (window.innerWidth >= 768) {
      changebox.animate({width: wordsize + 'px'}, 500);
    } else {
      changebox.css('width', '100%');
    }
  }

  // Handle mobile menu toggle
  $('#menu-toggle').click(function() {
    $('#mobile-menu').toggleClass('hidden');
});

// Handle mobile dropdowns
$('#mobile-menu .dropdown > a').click(function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).siblings('.dropdown-content').slideToggle();
});

// Close mobile dropdowns when clicking outside
$(document).on('click', function(e) {
    if (!$(e.target).closest('#mobile-menu .dropdown').length) {
        $('#mobile-menu .dropdown-content').slideUp();
    }
});

// Close mobile menu when a link is clicked
$('#mobile-menu a').click(function() {
    if (!$(this).siblings('.dropdown-content').length) {
        $('#mobile-menu').addClass('hidden');
    }
});
});
$(document).ready(function () {
  var changebox = $(".changebox");

  var firstclone = changebox.children(":first").clone();
  changebox.append(firstclone);

  function updateSizes() {
    var fontSize = parseFloat(changebox.parent().css("font-size"));
    var lineHeight = parseFloat(changebox.children("span:first").css("line-height"));
   
    changebox.css({
      "height": lineHeight + "px",
      "font-size": fontSize + "px"
    });
   
    return { fontSize: fontSize, lineHeight: lineHeight };
  }

  var sizes = updateSizes();
  ChangeSize(0);

  var animationInterval;
  function startAnimation() {
    if (!animationInterval) {
      animationInterval = setInterval(Next, 2000);
    }
  }
  function stopAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    Next.i = 0;
    changebox.scrollTop(0);
    ChangeSize(0);
  }
  function checkScreenSize() {
    sizes = updateSizes();
    if (window.innerWidth >= 200) {
      changebox.addClass('changebox-animate');
      startAnimation();
    } else {
      changebox.removeClass('changebox-animate');
      stopAnimation();
    }
  }
  checkScreenSize();
  $(window).resize(checkScreenSize);

  function Next(){
    if( typeof Next.i == 'undefined' ) {
      Next.i = 0;
    }
    Next.i++;
    if(Next.i == changebox.children("span").length){
      Next.i = 1;
      changebox.scrollTop(0);
    }
    changebox.animate({scrollTop: sizes.lineHeight * Next.i}, 500);
    setTimeout(function(){
      ChangeSize(Next.i);
    }, 500);
  }

  function ChangeSize(i){
    var word = changebox.children("span").eq(i);
    var wordsize = word.width();
    if (window.innerWidth >= 768) {
      changebox.animate({width: wordsize + 'px'}, 500);
    } else {
      changebox.css('width', '100%');
    }
  }

  // Handle mobile menu toggle
  $('#menu-toggle').click(function() {
    $('#mobile-menu').toggleClass('hidden');
});

// Handle mobile dropdowns
$('#mobile-menu .dropdown > a').click(function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).siblings('.dropdown-content').slideToggle();
});

// Close mobile dropdowns when clicking outside
$(document).on('click', function(e) {
    if (!$(e.target).closest('#mobile-menu .dropdown').length) {
        $('#mobile-menu .dropdown-content').slideUp();
    }
});

// Close mobile menu when a link is clicked
$('#mobile-menu a').click(function() {
    if (!$(this).siblings('.dropdown-content').length) {
        $('#mobile-menu').addClass('hidden');
    }
});
});