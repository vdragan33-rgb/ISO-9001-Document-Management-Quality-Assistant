/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { QMSEvent } from './types';

// Obtain the existing initialized firebase app instance from memory
const app = getApp();
const db = getFirestore(app);

// Collection Reference
const EVENTS_COLLECTION = 'qms_events';

/**
 * Validates Firestore connectivity during application boot.
 * Recommends logging the status of connection.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const q = query(collection(db, EVENTS_COLLECTION), where('createdBy', '==', 'test@test.com'));
    await getDocs(q);
    console.log('Firestore initialization check: Success. Database connected and rules verified.');
    return true;
  } catch (err) {
    console.warn('Firestore initialization check note:', err);
    return false;
  }
}

/**
 * Fetch QMS events from Firestore for the specific authenticated user email.
 */
export async function getEventsFromFirestore(userEmail: string): Promise<QMSEvent[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION), 
      where('createdBy', '==', userEmail)
    );
    const snapshot = await getDocs(q);
    const events: QMSEvent[] = [];
    snapshot.forEach((d) => {
      events.push({ id: d.id, ...d.data() } as QMSEvent);
    });
    // Sort in-memory to avoid index errors on compound queries
    return events.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  } catch (error) {
    console.error('Error fetching events from Firestore:', error);
    throw error;
  }
}

/**
 * Save/Create a new QMS event to Firestore.
 */
export async function saveEventToFirestore(event: QMSEvent): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, event.id);
    await setDoc(docRef, {
      ...event,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving event to Firestore:', error);
    throw error;
  }
}

/**
 * Update an existing QMS event in Firestore.
 */
export async function updateEventInFirestore(eventId: string, updates: Partial<QMSEvent>): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating event in Firestore:', error);
    throw error;
  }
}

/**
 * Delete a QMS event from Firestore.
 */
export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting event from Firestore:', error);
    throw error;
  }
}
