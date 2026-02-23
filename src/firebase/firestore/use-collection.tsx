'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    },
    collectionGroup: string | null;
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 * NOTE: This hook is not suitable for pagination as it does not expose document snapshots.
 * For paginated data, implement `onSnapshot` logic directly in your component.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // IMPORTANT: Differentiate between permission errors and other errors like missing indexes.
        if (error.code === 'permission-denied') {
            // This logic extracts the path from either a ref or a query
            let path = '';
            if (memoizedTargetRefOrQuery.type === 'collection') {
              path = (memoizedTargetRefOrQuery as CollectionReference).path;
            } else {
              // It's a query, which could be on a collection or a collection group.
              const q = memoizedTargetRefOrQuery as unknown as InternalQuery;
              if (q._query.collectionGroup) {
                // This is a collection group query. The path is the collection group ID.
                // We represent it in a way that's understandable in error messages.
                path = `**/${q._query.collectionGroup}`;
              } else {
                // This is a standard query on a single collection.
                path = q._query.path.canonicalString();
              }
            }
    
            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path,
            })
    
            setError(contextualError);
            // trigger global error propagation for permission errors
            errorEmitter.emit('permission-error', contextualError);
        } else {
            // For all other errors (e.g., 'failed-precondition' for missing index),
            // set the original error. This allows the UI to see the real error message
            // from Firebase, which might include a link to create a missing index.
            console.error("useCollection Firestore Error:", error);
            setError(error);
            // We do not emit this on the global error emitter, as it's not a permission error
            // and will be handled by the component's local error state.
            // Next.js will still show this in the dev overlay.
        }

        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}
