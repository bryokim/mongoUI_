import type { AllDatabaseInfo, DatabaseInfo } from "./useDbsInfo";
import type { AssignedRolesOnDbs } from "./useRolesInfo";

/**
 * Implements functions for dealing with databases after connecting.
 */

export const useDb = () => {
  const databasesInfo = useDbsInfo();
  const rolesInfo = useRolesInfo();
  const pagesInfo = usePage();

  const setDbsInfo = (newValue: AllDatabaseInfo) => {
    databasesInfo.value = newValue;
  };

  const setRolesInfo = (newValue: AssignedRolesOnDbs) => {
    rolesInfo.value = newValue;
  };

  const setPage = (newValue: number, database: string, collection: string) => {
    if (!pagesInfo.value[database]) pagesInfo.value[database] = {};

    pagesInfo.value[database][collection] = newValue;
  };

  /**
   * Gets database info and sets the value for `useDbsInfo`.
   *
   * @async
   */
  const getDbsInfo = async () => {
    const dbsAndCols = await $fetch("/api/db");

    setDbsInfo(dbsAndCols);
  };

  /**
   * Gets roles info and sets the value for `useRolesInfo`.
   *
   * @async
   */
  const getRolesInfo = async () => {
    const rolesInfo = await $fetch("/api/db/roles");

    setRolesInfo(rolesInfo);
  };

  /**
   * Creates a new empty database.
   *
   * The database is implied and is only added to the mongodb
   * when the first document is inserted.
   *
   * @param database name of the new database.
   * @param collection name of the new collection.
   */
  const createDb = async (database: string, collection: string) => {
    const data = (await $fetch("/api/db/create", {
      method: "POST",
      body: {
        database,
        collection,
      },
    })) as DatabaseInfo[];

    setDbsInfo({ nonEmpty: useDbsInfo().value?.nonEmpty, empty: data });
  };

  /**
   * Sends request to drop a database.
   *
   * @async
   *
   * @param database name of the database to drop.
   */
  const dropDb = async (database: string) => {
    const dropped = await $fetch("/api/db/drop", {
      method: "POST",
      body: { database },
    });

    if (dropped.detail == "ok") {
      // Reload `useDbsInfo` with the new databases.
      await getDbsInfo();
    } else {
      throw Error("Error occurred while dropping the database");
    }
  };

  /**
   * Sends request to create a new collection.
   *
   * @async
   *
   * @param database name of the database to add the collection into.
   * @param collection name of the new collection.
   */
  const createCollection = async (database: string, collection: string) => {
    const created = await $fetch("/api/collection/create", {
      method: "POST",
      body: { database, collection },
    });

    if (created.detail == "ok") {
      // Reload `useDbsInfo` with the new collections.
      await getDbsInfo();
    } else {
      throw Error("Error occurred while creating the collection");
    }
  };

  /**
   * Finds documents in the next page to be added to the display.
   *
   * @param database name of the database.
   * @param collection name of the collection.
   * @param side the side of the infinity scroll being loaded.
   *
   * @returns array of documents in the next current page.
   */
  const findDocumentsInPage = async (
    database: string,
    collection: string,
    side: string
  ) => {
    let nextPage = 0;

    if (pagesInfo.value[database]) {
      nextPage = pagesInfo.value[database][collection];
    } else {
      setPage(0, database, collection);
    }

    const documents = await $fetch("/api/collection/documents", {
      method: "GET",
      query: {
        database,
        collection,
        page: nextPage,
      },
    });

    // Increment or decrement page depending on the side being loaded.
    if (side === "end" && documents.length > 0) {
      setPage(nextPage + 1, database, collection);
    } else if (side === "start" && nextPage - 1 >= 0) {
      setPage(nextPage - 1, database, collection);
    }

    return documents;
  };

  /**
   * Finds documents that match filter in the given collection.
   *
   * @param database name of the database.
   * @param collection name of the collection.
   * @param filter search criteria.
   * @returns documents that match the filter.
   */
  const findDocuments = async (
    database: string,
    collection: string,
    filter: { [propName: string]: string }
  ) => {
    const documents = await $fetch("/api/documents/find", {
      method: "POST",
      body: {
        database,
        collection,
        filter,
      },
    });

    return documents;
  };

  return {
    setDbsInfo,
    setRolesInfo,
    setPage,
    getDbsInfo,
    getRolesInfo,
    createDb,
    dropDb,
    createCollection,
    findDocumentsInPage,
    findDocuments,
  };
};
