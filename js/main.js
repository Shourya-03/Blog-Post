// main.js - JavaScript for The Unconventional Life website

// Navigation Menu Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
  const isExpanded = navToggle.getAttribute('aria-expanded') === 'true' || false;
  navToggle.setAttribute('aria-expanded', !isExpanded);
});

// Back to Top Button
const backToTopButton = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopButton.classList.add('show');
  } else {
    backToTopButton.classList.remove('show');
  }
});

backToTopButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    item.classList.toggle('open');
    const isOpen = item.classList.contains('open');
    question.setAttribute('aria-expanded', isOpen);
  });
});

// Slider/Carousel Logic
const sliderContainer = document.getElementById('sliderContainer');
const sliderPrev = document.getElementById('sliderPrev');
const sliderNext = document.getElementById('sliderNext');
const sliderDots = document.getElementById('sliderDots').children;

let currentSlide = 0;
const totalSlides = sliderContainer.children.length;

function updateSlider(position) {
  sliderContainer.scrollTo({ left: position * sliderContainer.clientWidth, behavior: 'smooth' });
  [...sliderDots].forEach(dot => dot.classList.remove('active'));
  sliderDots[position].classList.add('active');
}

sliderPrev.addEventListener('click', () => {
  currentSlide = (currentSlide === 0) ? totalSlides - 1 : currentSlide - 1;
  updateSlider(currentSlide);
});

sliderNext.addEventListener('click', () => {
  currentSlide = (currentSlide + 1) % totalSlides;
  updateSlider(currentSlide);
});

[...sliderDots].forEach((dot, index) => {
  dot.addEventListener('click', () => {
    currentSlide = index;
    updateSlider(currentSlide);
  });
});

// Newsletter Form Submission (Mock)
const newsletterForm = document.getElementById('newsletterForm');
newsletterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const emailInput = newsletterForm.querySelector('#email');
  if (emailInput.value === '') {
    alert('Please enter a valid email.');
    return;
  }
  alert(`Thank you for subscribing with ${emailInput.value}!`);
  newsletterForm.reset();
});

// Set current year in footer
const currentYear = document.getElementById('currentYear');
currentYear.textContent = new Date().getFullYear();
