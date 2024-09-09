$(document).ready(function () {
  console.log("Document is ready");

  var changebox = $(".changebox");
  console.log("Changebox element found:", changebox);

  var firstclone = changebox.children(":first").clone();
  changebox.append(firstclone);
  console.log("First child of changebox cloned and appended");

  function updateSizes() {
    var fontSize = parseFloat(changebox.parent().css("font-size"));
    var lineHeight = parseFloat(changebox.children("span:first").css("line-height"));
    console.log("Font size and line height updated:", { fontSize: fontSize, lineHeight: lineHeight });

    changebox.css({
      "height": lineHeight + "px",
      "font-size": fontSize + "px"
    });

    return { fontSize: fontSize, lineHeight: lineHeight };
  }

  var sizes = updateSizes();
  console.log("Initial sizes:", sizes);

  ChangeSize(0);

  var animationInterval;
  function startAnimation() {
    if (!animationInterval) {
      console.log("Starting animation");
      animationInterval = setInterval(Next, 2000);
    }
  }

  function stopAnimation() {
    if (animationInterval) {
      console.log("Stopping animation");
      clearInterval(animationInterval);
      animationInterval = null;
    }
    Next.i = 0;
    changebox.scrollTop(0);
    ChangeSize(0);
    console.log("Animation reset and stopped");
  }

  function checkScreenSize() {
    sizes = updateSizes();
    if (window.innerWidth >= 200) {
      console.log("Screen width >= 200px, starting animation");
      changebox.addClass('changebox-animate');
      startAnimation();
    } else {
      console.log("Screen width < 200px, stopping animation");
      changebox.removeClass('changebox-animate');
      stopAnimation();
    }
  }

  checkScreenSize();
  $(window).resize(function () {
    console.log("Window resized");
    checkScreenSize();
  });

  function Next() {
    if (typeof Next.i == 'undefined') {
      Next.i = 0;
    }
    Next.i++;
    console.log("Next item index:", Next.i);

    if (Next.i == changebox.children("span").length) {
      Next.i = 1;
      changebox.scrollTop(0);
      console.log("Reached the last item, scrolling back to the first one");
    }

    changebox.animate({ scrollTop: sizes.lineHeight * Next.i }, 500);
    setTimeout(function () {
      ChangeSize(Next.i);
    }, 500);
  }

  function ChangeSize(i) {
    var word = changebox.children("span").eq(i);
    var wordsize = word.width();
    console.log("Changing size for word at index:", i, "Width:", wordsize);

    if (window.innerWidth >= 768) {
      changebox.animate({ width: wordsize + 'px' }, 500);
    } else {
      changebox.css('width', '100%');
    }
  }

  // Handle mobile menu toggle
  $('#menu-toggle').click(function () {
    console.log("Menu toggle button clicked");
    $('#mobile-menu').toggleClass('hidden');
  });

  // Handle mobile dropdowns
  $('#mobile-menu .dropdown > a').click(function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Dropdown clicked in mobile menu:", $(this));
    $(this).siblings('.dropdown-content').slideToggle();
  });

  // Close mobile dropdowns when clicking outside
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#mobile-menu .dropdown').length) {
      console.log("Click outside of dropdown, closing dropdown content");
      $('#mobile-menu .dropdown-content').slideUp();
    }
  });

  // Close mobile menu when a link is clicked
  $('#mobile-menu a').click(function () {
    if (!$(this).siblings('.dropdown-content').length) {
      console.log("Mobile menu link clicked, closing mobile menu");
      $('#mobile-menu').addClass('hidden');
    }
  });
});