import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private baseUrl = 'https://jsonplaceholder.typicode.com';

  constructor(private http: HttpClient) {
  }

  getData(endpoint: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${endpoint}`);
  }

  postData(endpoint: string, body: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${endpoint}`, body);
  }
}
