import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return true;
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('Face-api models loaded successfully!');
    return true;
  } catch (err) {
    console.warn('Gagal memuat model dari /models, mencoba fallback CDN...', err);
    try {
      const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL)
      ]);
      modelsLoaded = true;
      return true;
    } catch (e2) {
      console.error('Semua model face-api gagal dimuat:', e2);
      return false;
    }
  }
}

export async function getFaceDescriptorFromVideo(videoElement) {
  if (!modelsLoaded) {
    const ok = await loadFaceModels();
    if (!ok) throw new Error('Model deteksi wajah belum siap.');
  }

  const detection = await faceapi
    .detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return Array.from(detection.descriptor);
}

export function captureSnapshot(videoElement, maxWidth = 320) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxWidth / videoElement.videoWidth);
  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function calculateDistance(descriptorA, descriptorB) {
  if (!descriptorA || !descriptorB) return 1.0;
  return faceapi.euclideanDistance(descriptorA, descriptorB);
}

export function isFaceMatch(descriptorA, descriptorB, threshold = 0.55) {
  if (!descriptorA || !descriptorB) return { match: false, distance: 1.0, confidence: 0 };
  const distance = calculateDistance(descriptorA, descriptorB);
  const confidence = Math.max(0, Math.min(100, Math.round((1 - (distance / 0.8)) * 100)));
  return {
    match: distance <= threshold,
    distance,
    confidence: Math.max(10, confidence)
  };
}

export function findBestMatch(currentDescriptor, usersList, threshold = 0.55) {
  if (!currentDescriptor || !usersList || usersList.length === 0) return null;

  let bestUser = null;
  let minDistance = 1.0;

  for (const user of usersList) {
    if (!user.face_descriptor || !Array.isArray(user.face_descriptor) || user.face_descriptor.length === 0) {
      continue;
    }
    const dist = calculateDistance(currentDescriptor, user.face_descriptor);
    if (dist < minDistance) {
      minDistance = dist;
      bestUser = user;
    }
  }

  if (bestUser && minDistance <= threshold) {
    const confidence = Math.max(10, Math.min(100, Math.round((1 - (minDistance / 0.8)) * 100)));
    return {
      user: bestUser,
      distance: minDistance,
      confidence
    };
  }

  return null;
}
