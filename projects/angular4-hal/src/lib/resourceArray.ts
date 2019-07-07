/* tslint:disable:variable-name */
import {Observable, throwError as observableThrowError} from 'rxjs';

import {catchError, map} from 'rxjs/operators';
import {Sort} from './sort';
import {ArrayInterface} from './arrayInterface';
import {ResourceHelper} from './resourceHelper';
import {Resource} from './resource';
import * as url from 'url';

export class ResourceArray<T extends Resource> implements ArrayInterface<T> {
  public sortInfo: Sort[];

  public proxyUrl: string;
  public rootUrl: string;

  public self_uri: string;
  public next_uri: string;
  public prev_uri: string;
  public first_uri: string;
  public last_uri: string;

  public _embedded;

  public totalElements = 0;
  public totalPages = 1;
  public pageNumber = 1;
  public pageSize: number;

  public result: T[] = [];

  private static replaceOrAdd(query: string, field: string, value: string): string {
    if (query) {
      const idx: number = query.indexOf(field);
      const idxNextAmp: number = query.indexOf('&', idx) === -1 ? query.indexOf('/', idx) : query.indexOf('&', idx);

      if (idx !== -1) {
        const searchValue = query.substring(idx, idxNextAmp);
        query = query.replace(searchValue, field + '=' + value);
      } else {
        query = query.concat('&' + field + '=' + value);
      }
    } else {
      query = '?' + field + '=' + value;
    }
    return query;
  }

  push(el: T) {
    this.result.push(el);
  }

  length(): number {
    return this.result.length;
  }

// Load next page
  next(type: new() => T): Observable<ResourceArray<T>> {
    if (this.next_uri) {
      return ResourceHelper.getHttp().get(ResourceHelper.getProxy(this.next_uri), {
        headers: ResourceHelper.headers,
        observe: 'response'
      }).pipe(
        map(response => this.init(type, response, this.sortInfo)),
        catchError(error => observableThrowError(error)));
    }
    return observableThrowError('no next defined');
  }

  prev(type: new() => T): Observable<ResourceArray<T>> {
    if (this.prev_uri) {
      return ResourceHelper.getHttp().get(ResourceHelper.getProxy(this.prev_uri), {
        headers: ResourceHelper.headers,
        observe: 'response'
      }).pipe(
        map(response => this.init(type, response, this.sortInfo)),
        catchError(error => observableThrowError(error)));
    }
    return observableThrowError('no prev defined');
  }

  first(type: new() => T): Observable<ResourceArray<T>> {
    if (this.first_uri) {
      return ResourceHelper.getHttp().get(ResourceHelper.getProxy(this.first_uri), {
        headers: ResourceHelper.headers,
        observe: 'response'
      }).pipe(
        map(response => this.init(type, response, this.sortInfo)),
        catchError(error => observableThrowError(error)));
    }
    return observableThrowError('no first defined');
  }

// Load first page

  last(type: new() => T): Observable<ResourceArray<T>> {
    if (this.last_uri) {
      return ResourceHelper.getHttp().get(ResourceHelper.getProxy(this.last_uri), {
        headers: ResourceHelper.headers,
        observe: 'response'
      }).pipe(
        map(response => this.init(type, response, this.sortInfo)),
        catchError(error => observableThrowError(error)));
    }
    return observableThrowError('no last defined');
  }

// Load last page

  page(type: new() => T, pageNumber: number): Observable<ResourceArray<T>> {
    this.self_uri = this.self_uri.replace('{?page,size,sort,projection}', '');
    this.self_uri = this.self_uri.replace('{&sort}', '');
    const urlParsed = url.parse(ResourceHelper.getProxy(this.self_uri));
    let query: string = ResourceArray.replaceOrAdd(urlParsed.query, 'size', this.pageSize.toString());
    query = ResourceArray.replaceOrAdd(query, 'page', pageNumber.toString());


    let uri = urlParsed.query ?
      ResourceHelper.getProxy(this.self_uri).replace(urlParsed.query, query) : ResourceHelper.getProxy(this.self_uri).concat(query);
    uri = this.addSortInfo(uri);
    return ResourceHelper.getHttp().get(uri, {
      headers: ResourceHelper.headers,
      observe: 'response'
    }).pipe(
      map(response => this.init(type, response, this.sortInfo)),
      catchError(error => observableThrowError(error)));
  }

// Load page with given pageNumber

  sortElements(type: new() => T, ...sort: Sort[]): Observable<ResourceArray<T>> {
    this.self_uri = this.self_uri.replace('{?page,size,sort}', '');
    this.self_uri = this.self_uri.replace('{&sort}', '');
    let uri = ResourceHelper.getProxy(this.self_uri).concat('?', 'size=', this.pageSize.toString(), '&page=', this.pageNumber.toString());
    uri = this.addSortInfo(uri);
    return ResourceHelper.getHttp().get(uri, {
      headers: ResourceHelper.headers,
      observe: 'response'
    }).pipe(
      map(response => this.init(type, response, sort)),
      catchError(error => observableThrowError(error)));
  }

// Sort collection based on given sort attribute

  size(type: new() => T, size: number): Observable<ResourceArray<T>> {
    let uri = ResourceHelper.getProxy(this.self_uri).concat('?', 'size=', size.toString());
    uri = this.addSortInfo(uri);
    return ResourceHelper.getHttp().get(uri, {
      headers: ResourceHelper.headers,
      observe: 'response'
    }).pipe(
      map(response => this.init(type, response, this.sortInfo)),
      catchError(error => observableThrowError(error)));
  }

// Load page with given size

  private init(type: new() => T, response: any, sortInfo: Sort[]): ResourceArray<T> {
    const result: ResourceArray<T> = ResourceHelper.createEmptyResult<T>(this._embedded);
    result.sortInfo = sortInfo;
    ResourceHelper.instantiateResourceCollection(type, response, result);
    return result;
  }

  private addSortInfo(uri: string) {
    if (this.sortInfo) {
      for (const item of this.sortInfo) {
        uri = uri.concat('&sort=', item.path, ',', item.order);
      }
    }
    return uri;
  }
}