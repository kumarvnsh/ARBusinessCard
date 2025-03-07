// Import the createClient function from Supabase using ES module syntax.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/webxr/VRButton.js';

// Initialize the Supabase client with your project details.
const SUPABASE_URL = 'https://icxcmpdmpunkenfwvyfa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeGNtcGRtcHVua2VuZnd2eWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNjg2MjcsImV4cCI6MjA1Njk0NDYyN30.z_dVBHedG1L_6AVazKPTQkwLIpjEcvLoc4Vj96nbIVg';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get form elements
const statusDiv = document.getElementById("status");
const generateButton = document.getElementById("generateCardButton");
const cardImageInput = document.getElementById("cardImageInput");
const profileImageInput = document.getElementById("profileImageInput");

// Variables to hold image files
let cardImageFile = null;
let profileImageFile = null;

cardImageInput.addEventListener("change", (e) => {
  cardImageFile = e.target.files[0];
});

profileImageInput.addEventListener("change", (e) => {
  profileImageFile = e.target.files[0];
});

// When user clicks "Generate AR Card"
generateButton.addEventListener("click", async () => {
  // Validate inputs
  const name = document.getElementById("name").value;
  const title = document.getElementById("title").value;
  if (!name || !title) {
    statusDiv.textContent = "Name and Job Title are required!";
    return;
  }
  if (!cardImageFile || !profileImageFile) {
    statusDiv.textContent = "Both images must be uploaded!";
    return;
  }

  statusDiv.textContent = "Uploading images...";

  try {
    // Upload images to Supabase Storage
    const cardUploadResponse = await uploadImageToSupabase(cardImageFile, `cards/${Date.now()}_card.jpg`);
    const profileUploadResponse = await uploadImageToSupabase(profileImageFile, `cards/${Date.now()}_profile.jpg`);

    const cardImageURL = cardUploadResponse.publicURL;
    const profileImageURL = profileUploadResponse.publicURL;

    statusDiv.textContent = "Images uploaded. Saving card data...";

    // Save business card data (insert into 'business_cards' table)
    const { data, error } = await supabaseClient
  .from('business_cards')
  .insert([
    {
      name: name,
      title: title,
      linkedin: document.getElementById("linkedin").value,
      portfolio: document.getElementById("portfolio").value,
      card_image_url: cardImageURL,
      profile_image_url: profileImageURL
    }
  ])
  .select(); // This ensures the inserted row is returned.

      
    if (error) throw error;
    
    statusDiv.textContent = "Business card created successfully!";
    
    // Launch AR experience using the saved record
    startARExperience(data[0]);

  } catch (err) {
    console.error(err);
    statusDiv.textContent = "Error: " + err.message;
  }
});

// Function to upload an image to Supabase Storage using the Supabase client
async function uploadImageToSupabase(file, path) {
  // Upload file to the 'cards' bucket
  const { data, error } = await supabaseClient.storage.from('cards').upload(path, file);
  if (error) throw error;
  // Get public URL for the uploaded file
  const { publicURL, error: urlError } = supabaseClient.storage.from('cards').getPublicUrl(path);
  if (urlError) throw urlError;
  return { publicURL };
}

// Function to start AR experience using Three.js and WebXR
function startARExperience(cardData) {
  // Hide the form and show AR container
  document.getElementById("formContainer").style.display = "none";
  document.getElementById("arContainer").style.display = "block";

  // Set up Three.js scene
  const canvas = document.getElementById("arCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.xr.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
  scene.add(camera);

  // Add lighting
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Create a plane for the business card
  const geometry = new THREE.PlaneGeometry(1, 0.6);
  const textureLoader = new THREE.TextureLoader();
  const cardTexture = textureLoader.load(cardData.card_image_url);
  const material = new THREE.MeshBasicMaterial({ map: cardTexture });
  const cardMesh = new THREE.Mesh(geometry, material);
  cardMesh.position.set(0, 1.5, -2);
  scene.add(cardMesh);

  // Add profile picture as a child plane on the card
  const profileGeometry = new THREE.PlaneGeometry(0.3, 0.3);
  const profileTexture = textureLoader.load(cardData.profile_image_url);
  const profileMaterial = new THREE.MeshBasicMaterial({ map: profileTexture, transparent: true });
  const profileMesh = new THREE.Mesh(profileGeometry, profileMaterial);
  profileMesh.position.set(0, 0.3, 0.01);
  cardMesh.add(profileMesh);

  // Add VRButton to enable immersive AR mode
  document.body.appendChild(VRButton.createButton(renderer));

  // Animation loop
  function animate() {
    renderer.setAnimationLoop(render);
  }
  function render() {
    renderer.render(scene, camera);
  }
  animate();

  // Handle window resize
  window.addEventListener('resize', onWindowResize, false);
  function onWindowResize(){
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
