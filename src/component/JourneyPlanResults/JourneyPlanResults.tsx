import * as React from 'react';
import {
  Journey,
  SearchResults,
} from "../../service/JourneyPlanner/JourneyPlanner";
import * as moment from "moment";
import autobind from "autobind-decorator";
import "./JourneyPlanResults.css";
import {JourneyDetails} from "./JourneyDetails/JourneyDetails";
import {Price} from "./../Price/Price";
import {locationByCode} from "../../config/locations";
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';


@autobind
export class JourneyPlanResults extends React.Component<JourneyPlanResultsProps, JourneyPlanResultsState> {

  public state = {
    outward: {
      selected: "",
      open: ""
    },
    inward: {
      selected: "",
      open: ""
    }
  };

  public static getDerivedStateFromProps(props: SearchResults, state: JourneyPlanResultsState) {
    const outwardValid = props.response.fares[state.outward.selected];
    const outwardSelected = outwardValid ? state.outward.selected : props.response.cheapestOutward;
    const outwardFares = props.response.fares[outwardSelected] as any;
    const inwardValid = outwardFares && outwardFares.with && outwardFares.with[state.inward.selected];
    const inwardSelected = inwardValid ? state.inward.selected : props.response.cheapestInward;

    return {
      outward: {
        selected: outwardSelected,
        open: state.outward.open,
      },
      inward: {
        selected: inwardSelected,
        open: state.inward.open
      }
    };
  }

  public componentDidUpdate(prevProps: JourneyPlanResultsProps, prevState: JourneyPlanResultsState) {
    if (this.props.response.outward.length === 0) {
      return;
    }

    if (this.props.response.cheapestOutward !== prevProps.response.cheapestOutward) {
      this.scroll("outward");
    }

    if (this.props.response.cheapestInward !== prevProps.response.cheapestInward) {
      this.scroll("inward");
    }

    if (this.state.outward.selected !== prevState.outward.selected || this.state.inward.selected !== prevState.inward.selected) {
      const outwardFares = this.props.response.fares[this.state.outward.selected] as any;
      const outwardPrice = outwardFares.price;
      const inwardPrice = this.props.response.inward.length === 0 ? 0 : outwardFares.with[this.state.inward.selected].price;

      this.props.onPriceChange(outwardPrice + inwardPrice);
    }
  }

  private scroll(direction: keyof JourneyPlanResultsState) {
    const el = document.querySelector(`.fares-${direction} .is-selected`);

    if (el) {
      scrollIntoViewIfNeeded(el, { behavior: "instant", scrollMode: "if-needed" });
    }
  }

  public render() {
    return (
      <section className="fares">
        <div className="container">
          <div className="row">
          { this.props.response.outward.length === 0  ? this.renderNoResults() : this.renderResults() }
          </div>
        </div>
      </section>
    );
  }

  public renderResults() {
    const isReturn = this.props.response.inward.length > 0;
    const inwardJourneyFares = this.props.response.fares[this.state.outward.selected] as any;

    return (
      <React.Fragment>
        { this.renderJourneys(this.props.response.outward, this.props.response.fares, "outward") }
        { !isReturn && this.renderEmptyReturn()}
        { isReturn && this.renderJourneys(this.props.response.inward, inwardJourneyFares.with, "inward") }
      </React.Fragment>
    )
  }

  public renderEmptyReturn() {
    return (
      <div className="col-md-12">
        <h3 className="fares--direction bold">No return selected</h3>
        <div className={this.props.lessHeight ? "fares--empty-return fares--empty-return__short center" : "fares--empty-return center"}>
          <p className="fares--empty-title">No return journey selected</p>
        </div>
      </div>
    );
  }

  public renderNoResults() {
    return (
      <div className="col-sm-24 center">
        <p className="fares--empty-title">Add some search criteria to see results</p>
      </div>
    );
  }

  public renderJourneys(journeys: Journey[], journeyPrice: JourneyPriceIndex, direction: keyof JourneyPlanResultsState) {
    const [title, from, to] = direction === "outward"
      ? ["Going out", this.props.query.origin, this.props.query.destination]
      : ["Coming back", this.props.query.destination, this.props.query.origin];

    return (
      <div className="col-md-12">
        <h3 className="fares--direction bold">{ `${title} - ${locationByCode[from].name} to ${locationByCode[to].name}` }</h3>
        {/*<FareGraph journeys={journeys} fares={journeyPrice}/>*/}
        <ol className={this.props.lessHeight ? "fare-list fare-list__short clearfix fares-" + direction : "fare-list clearfix fares-" + direction}>
          { journeys.map(j => this.renderJourney(j, journeyPrice, direction)) }
        </ol>
      </div>
    )
  }

  public renderJourney(journey: Journey, journeyPrice: JourneyPriceIndex, direction: keyof JourneyPlanResultsState) {
    const duration = journey.arrivalTime - journey.departureTime;
    const durationFormat = duration < 3600 ? "m[min. ]" : "H[hrs] m[min. ]";
    const changeDescription = journey.legs.length === 1
      ? "Direct"
      : "Change at " + journey.legs.slice(0, -1).map(l => locationByCode[l.destination].name).join(", ");

    return (
      <li onClick={this.onSelect(journey.id, direction)} key={journey.id} className={journey.id === this.state[direction].selected ? "fare-list--item is-selected" : "fare-list--item"}>
        <div className="fare-list--item-container">
          <div className="row">
            <div className="col-18">
              <div className="row">
                <div className="col-5">
                  <time className="fare-list--time">
                    {moment.unix(journey.departureTime).utc().format(moment.HTML5_FMT.TIME)}
                  </time>
                </div>
                <div className="col-19"> 
                  <p className="fare-list--station">{locationByCode[journey.origin].name}</p>
                </div>
              </div>
              <div className="row fare-list--line">
                <div className="offset-5 col-19">
                  <button title={changeDescription} type="button" className={journey.id === this.state[direction].open ? "fare-list--btn-legs is-active" : "fare-list--btn-legs"} onClick={this.onOpen(journey.id, direction)}>
                    {moment.unix(duration).utc().format(durationFormat)}
                    {changeDescription}
                    <span className="sr-only">show more journey information</span>
                  </button>
                  {journey.id === this.state[direction].open && <JourneyDetails journey={journey} />}
                </div>
              </div>
              <div className="row">
                <div className="col-5">
                  <time className="fare-list--time">
                    {moment.unix(journey.arrivalTime).utc().format(moment.HTML5_FMT.TIME)}
                  </time>
                </div>
                <div className="col-19">
                  <p className="fare-list--station">
                  {locationByCode[journey.destination].name}&nbsp;
                  </p>
                </div>
              </div>
            </div>
            <div className="col-6 text-right">
              <Price direction={direction} value={journeyPrice[journey.id].price} />
            </div>
          </div>
        </div>
      </li>
    );
  }

  public onSelect(journeyId: string, direction: keyof JourneyPlanResultsState) {
    return () => this.setState({
      [direction]: {
        selected: journeyId,
        open: this.state[direction].open
      }
    } as any);
  }

  public onOpen(journeyId: string, direction: keyof JourneyPlanResultsState) {
    return (event: React.FormEvent<HTMLButtonElement>) => {
      this.setState({
        [direction]: {
          selected: this.state[direction].selected,
          open: this.state[direction].open === journeyId ? "" : journeyId
        }
      } as any);

      event.stopPropagation();
    }
  }

}

interface JourneyPlanResultsProps extends SearchResults {
  lessHeight: boolean;
  onPriceChange: (price: number) => any;
}

interface JourneyPlanResultsState {
  outward: {
    selected: string;
    open: string;
  };
  inward: {
    selected: string;
    open: string;
  };
}

export interface JourneyPriceIndex {
  [journeyId: string]: {
    price: number;
  }
}