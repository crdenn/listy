/**
 * Firestore Database Operations
 * 
 * All database operations are centralized here for maintainability.
 * Each function handles its own error handling and returns typed results.
 * 
 * Collection structure:
 * - /lists/{listId} - List documents
 * - /lists/{listId}/items/{itemId} - Item subcollection
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentReference,
  QueryConstraint,
} from 'firebase/firestore';
import { firebaseDb } from './config';
import { List, CreateListInput, ListItem, UserIdentity, UserSession, SavedListRef, ListMember } from '@/types';
import { createShareCode, createGroupCode } from '@/lib/utils';

// Collection references
const listsCollection = collection(firebaseDb, 'lists');
const userSavedLists = (userId: string) => collection(firebaseDb, 'users', userId, 'savedLists');
const listMembersCollection = (listId: string) => collection(firebaseDb, 'lists', listId, 'members');

/**
 * Get the items subcollection reference for a list
 */
function getItemsCollection(listId: string) {
  return collection(firebaseDb, 'lists', listId, 'items');
}

// ============================================
// List Operations
// ============================================

/**
 * Create a new list
 */
export async function createList(
  input: CreateListInput,
  user: UserSession
): Promise<List> {
  const shareCode = createShareCode();
  const groupName = input.groupName?.trim();
  const groupCode = input.groupCode?.trim() || (groupName ? createGroupCode() : undefined);
  
  const listData = {
    title: input.title,
    description: input.description || '',
    groupName: groupName || '',
    groupCode: groupCode || '',
    eventDate: input.eventDate || '',
    eventTime: input.eventTime || '',
    eventLocation: input.eventLocation || '',
    type: input.type,
    shareCode,
    creatorId: user.id,
    creatorName: user.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(listsCollection, listData);
  
  // Return the created list with its ID
  return {
    id: docRef.id,
    ...listData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as List;
}

/**
 * Get a list by its share code
 */
export async function getListByShareCode(shareCode: string): Promise<List | null> {
  const q = query(listsCollection, where('shareCode', '==', shareCode));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as List;
}

/**
 * Get a list by its ID
 */
export async function getListById(listId: string): Promise<List | null> {
  const docRef = doc(listsCollection, listId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return { id: snapshot.id, ...snapshot.data() } as List;
}

/**
 * Get all lists created by a user
 */
export async function getListsByCreator(creatorId: string): Promise<List[]> {
  const q = query(
    listsCollection,
    where('creatorId', '==', creatorId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as List));
}

/**
 * Get all lists that share the same group code
 */
export async function getListsByGroupCode(groupCode: string): Promise<List[]> {
  const q = query(
    listsCollection,
    where('groupCode', '==', groupCode),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as List));
}

/**
 * Fallback: Get all lists that share the same group name (for older data)
 */
export async function getListsByGroupName(groupName: string): Promise<List[]> {
  const q = query(
    listsCollection,
    where('groupName', '==', groupName),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as List));
}

/**
 * Update a list's details
 */
export async function updateList(
  listId: string,
  updates: Partial<Pick<List, 'title' | 'description' | 'groupName' | 'groupCode' | 'eventDate' | 'eventTime' | 'eventLocation' | 'type'>>
): Promise<void> {
  const docRef = doc(listsCollection, listId);
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.groupName !== undefined) updateData.groupName = updates.groupName || '';
  if (updates.groupCode !== undefined) updateData.groupCode = updates.groupCode || '';
  if (updates.eventDate !== undefined) updateData.eventDate = updates.eventDate || '';
  if (updates.eventTime !== undefined) updateData.eventTime = updates.eventTime || '';
  if (updates.eventLocation !== undefined) updateData.eventLocation = updates.eventLocation || '';
  if (updates.type !== undefined) updateData.type = updates.type;

  await updateDoc(docRef, updateData);
}

/**
 * Delete a list and all its items
 */
export async function deleteList(listId: string): Promise<void> {
  const batch = writeBatch(firebaseDb);
  
  // Delete all items first
  const itemsRef = getItemsCollection(listId);
  const itemsSnapshot = await getDocs(itemsRef);
  itemsSnapshot.docs.forEach(itemDoc => {
    batch.delete(itemDoc.ref);
  });
  
  // Delete the list
  batch.delete(doc(listsCollection, listId));
  
  await batch.commit();
}

/**
 * Save a list reference under a user (for "shared with me"/recent lists)
 */
export async function saveListForUser(userId: string, list: List): Promise<void> {
  const ref = doc(userSavedLists(userId), list.id);
  const data: SavedListRef = {
    listId: list.id,
    shareCode: list.shareCode,
    title: list.title,
    lastOpenedAt: Timestamp.now(),
  };
  await setDoc(ref, data);
}

/**
 * Get saved/shared lists for a user, sorted by last opened
 */
export async function getSavedListsForUser(userId: string): Promise<SavedListRef[]> {
  const q = query(userSavedLists(userId), orderBy('lastOpenedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as SavedListRef);
}

/**
 * Subscribe to real-time updates for a list
 */
export function subscribeToList(
  listId: string,
  callback: (list: List | null) => void
): () => void {
  const docRef = doc(listsCollection, listId);
  
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as List);
  });
}

// ============================================
// Item Operations
// ============================================

/**
 * Add an item to a list
 */
export async function addItem(
  listId: string,
  input: { title: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string },
  user: UserIdentity
): Promise<ListItem> {
  const itemsRef = getItemsCollection(listId);
  
  const itemData = {
    title: input.title,
    description: input.description || '',
    category: input.category?.trim() || '',
    price: input.price?.trim() || '',
    imageUrl: input.imageUrl?.trim() || '',
    productUrl: input.productUrl?.trim() || '',
    createdBy: {
      id: user.id,
      displayName: user.displayName,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(itemsRef, itemData);
  
  // Update the list's updatedAt timestamp
  await updateDoc(doc(listsCollection, listId), {
    updatedAt: serverTimestamp(),
  });
  
  return {
    id: docRef.id,
    ...itemData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as ListItem;
}

/**
 * Record or update a list member (authenticated viewer)
 */
export async function touchListMember(listId: string, user: UserSession): Promise<void> {
  const membersRef = listMembersCollection(listId);
  const memberDoc = doc(membersRef, user.id);
  const snapshot = await getDoc(memberDoc);
  const existing = snapshot.exists() ? snapshot.data() : null;
  const data = {
    displayName: user.displayName,
    joinedAt: existing?.joinedAt ?? serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  };
  await setDoc(memberDoc, data, { merge: true });
}

/**
 * Update an item's details
 */
export async function updateItem(
  listId: string,
  itemId: string,
  updates: { title?: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }
): Promise<void> {
  const itemRef = doc(getItemsCollection(listId), itemId);
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description || '';
  if (updates.category !== undefined) updateData.category = updates.category?.trim() || '';
  if (updates.price !== undefined) updateData.price = updates.price?.trim() || '';
  if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl?.trim() || '';
  if (updates.productUrl !== undefined) updateData.productUrl = updates.productUrl?.trim() || '';

  await updateDoc(itemRef, updateData);
  
  // Update the list's updatedAt timestamp
  await updateDoc(doc(listsCollection, listId), {
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an item from a list
 */
export async function deleteItem(listId: string, itemId: string): Promise<void> {
  const itemRef = doc(getItemsCollection(listId), itemId);
  await deleteDoc(itemRef);
  
  // Update the list's updatedAt timestamp
  await updateDoc(doc(listsCollection, listId), {
    updatedAt: serverTimestamp(),
  });
}

/**
 * Claim an item
 */
export async function claimItem(
  listId: string,
  itemId: string,
  user: UserIdentity
): Promise<void> {
  const itemRef = doc(getItemsCollection(listId), itemId);
  await updateDoc(itemRef, {
    claimedBy: {
      id: user.id,
      displayName: user.displayName,
    },
    claimedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Update the list's updatedAt timestamp
  await updateDoc(doc(listsCollection, listId), {
    updatedAt: serverTimestamp(),
  });
}

/**
 * Unclaim an item
 */
export async function unclaimItem(listId: string, itemId: string): Promise<void> {
  const itemRef = doc(getItemsCollection(listId), itemId);
  await updateDoc(itemRef, {
    claimedBy: null,
    claimedAt: null,
    updatedAt: serverTimestamp(),
  });
  
  // Update the list's updatedAt timestamp
  await updateDoc(doc(listsCollection, listId), {
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all items for a list
 */
export async function getItems(listId: string): Promise<ListItem[]> {
  const itemsRef = getItemsCollection(listId);
  const q = query(itemsRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ListItem));
}

/**
 * Get list members
 */
export async function getListMembers(listId: string): Promise<ListMember[]> {
  const membersRef = listMembersCollection(listId);
  const q = query(membersRef, orderBy('lastActiveAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ListMember));
}

/**
 * Subscribe to real-time updates for a list's items
 */
export function subscribeToItems(
  listId: string,
  callback: (items: ListItem[]) => void
): () => void {
  const itemsRef = getItemsCollection(listId);
  const q = query(itemsRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ListItem));
    callback(items);
  });
}

/**
 * Subscribe to list members
 */
export function subscribeToMembers(
  listId: string,
  callback: (members: ListMember[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const membersRef = listMembersCollection(listId);
  const q = query(membersRef, orderBy('lastActiveAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ListMember));
      callback(members);
    },
    (error) => {
      console.error('Members subscription error', error);
      onError?.(error);
    }
  );
}

// ============================================
// Data Migration (Anonymous → Authenticated)
// ============================================

/**
 * Migrate data from anonymous session to authenticated user
 * 
 * When a user signs in, we update all lists and items they created
 * as an anonymous user to be owned by their authenticated account.
 */
export async function migrateAnonymousData(
  anonymousId: string,
  authenticatedUser: { id: string; displayName: string | null }
): Promise<void> {
  const batch = writeBatch(firebaseDb);
  
  // Find all lists created by the anonymous user
  const listsQuery = query(listsCollection, where('creatorId', '==', anonymousId));
  const listsSnapshot = await getDocs(listsQuery);
  
  for (const listDoc of listsSnapshot.docs) {
    // Update the list creator
    batch.update(listDoc.ref, {
      creatorId: authenticatedUser.id,
      creatorName: authenticatedUser.displayName,
      updatedAt: serverTimestamp(),
    });
    
    // Note: For items, we now store createdBy as an object { id, displayName }
    // We need to query items where createdBy.id matches the anonymousId
    // However, Firestore doesn't support querying on nested object properties directly
    // So we'll need to iterate through all items and check
    const itemsRef = getItemsCollection(listDoc.id);
    const allItemsSnapshot = await getDocs(itemsRef);
    
    for (const itemDoc of allItemsSnapshot.docs) {
      const itemData = itemDoc.data();
      
      // Update items created by the anonymous user
      if (itemData.createdBy?.id === anonymousId) {
        batch.update(itemDoc.ref, {
          createdBy: {
            id: authenticatedUser.id,
            displayName: authenticatedUser.displayName,
          },
          updatedAt: serverTimestamp(),
        });
      }
      
      // Update claims by the anonymous user
      if (itemData.claimedBy?.id === anonymousId) {
        batch.update(itemDoc.ref, {
          claimedBy: {
            id: authenticatedUser.id,
            displayName: authenticatedUser.displayName,
          },
          updatedAt: serverTimestamp(),
        });
      }
    }
  }
  
  await batch.commit();
}
